import type { ProductIntelligence } from "./types";
import { searchService } from "../services/search";
import { processSearchResults } from "../services/search/mapper";
import { matchCandidates } from "./integration";
import type { ProviderError } from "../services/search/types";
import type { ProductIdentity } from "./resolver";

import { CartIntelDiscoveryProvider } from "../services/search/CartIntelDiscoveryProvider";
import { DiscoveryEngine } from "../services/search/discoveryEngine";
import type { SearchQueryInput } from "../services/search/queryGenerator";
import { RankedDiscoveryPipeline } from "../services/search/rankedDiscoveryPipeline";
import type { RankedProductResult } from "../services/search/rankedProductTypes";
import { identityToCanonicalProduct } from "../services/search/identityBridge";

export interface ComparisonResult {
  identity: ProductIdentity;
  errors: ProviderError[];
  rankedResult?: RankedProductResult;
}

/**
 * Orchestrates the full comparison pipeline:
 * 1. Fetches raw results via multi-query DiscoveryEngine & CartIntelDiscoveryProvider
 * 2. Maps raw results into ProductIntelligence using the core engine
 * 3. Resolves and matches candidates against the current product (Phase 1)
 * 4. Triggers Phase 2 Immersive Seller Search if Google product metadata is discovered
 * 5. Runs RankedDiscoveryPipeline on the final consolidated ProductIdentity
 * 6. Returns the single source of truth cluster (ProductIdentity), preserved errors, and ranked offers
 */
export async function compareProduct(
  currentProduct: ProductIntelligence
): Promise<ComparisonResult> {
  if (!currentProduct) {
    throw new Error("CartIntel Orchestrator: Cannot compare a null product.");
  }

  // 1. Convert ProductIntelligence to SearchQueryInput
  const queryInput: SearchQueryInput = {
    title: currentProduct.normalizedTitle || currentProduct.originalTitle || "",
    brand: currentProduct.brand,
    model: currentProduct.model,
    category: currentProduct.category,
    identifiers: {},
    attributes: {
      storage: currentProduct.storage,
      ram: currentProduct.ram,
      color: currentProduct.color,
      variant: currentProduct.variant,
      size: currentProduct.size,
    },
  };

  // 2. Instantiate DiscoveryEngine with CartIntelDiscoveryProvider
  const discoveryEngine = new DiscoveryEngine(new CartIntelDiscoveryProvider());

  console.log("[5] Marketplace multi-query discovery started");

  // 3. Execute multi-query discovery via DiscoveryEngine
  const discoveryResult = await discoveryEngine.discover(queryInput);

  // Extract errors from query discovery responses
  const errors: ProviderError[] = discoveryResult.queries
    .filter(q => Boolean(q.error))
    .map(q => ({
      providerId: q.provider,
      error: q.error!,
    }));

  const rawResults = discoveryResult.candidates || [];

  // 4. If completely empty, handle safe return / error throwing
  if (rawResults.length === 0) {
    if (errors.length > 0) {
      const errorMsg = errors.map(e => `${e.providerId}: ${e.error}`).join(" | ");
      throw new Error(`CartIntel Search failed: ${errorMsg}`);
    }

    const identity = matchCandidates(currentProduct, []);
    return {
      identity,
      errors,
    };
  }

  // 5. Map raw discovery results into ProductIntelligence candidates
  console.log(`[Diagnostic 4] Orchestrator passing to normalization: ${rawResults.length}`);
  const candidates = processSearchResults(rawResults);

  // 6. Resolve the clustered identity (Phase 1 matching)
  let identity = matchCandidates(currentProduct, candidates);

  // 7. Phase 2 Immersive Seller Discovery (retained for Google Product ID / Immersive Token)
  let bestMatch = null;
  if (
    identity.representative &&
    (identity.representative.metadata.googleProductId ||
      identity.representative.metadata.googleImmersiveToken)
  ) {
    bestMatch = identity.representative;
  } else {
    bestMatch = identity.products.find(
      p => p.metadata.googleProductId || p.metadata.googleImmersiveToken
    );
  }

  if (bestMatch) {
    console.log(
      `[Diagnostic 5] Triggering Phase 2 Immersive Search for: ${bestMatch.normalizedTitle}`
    );

    const immersiveRequest = {
      ...currentProduct,
      googleProductId: bestMatch.metadata.googleProductId,
      googleImmersiveToken: bestMatch.metadata.googleImmersiveToken,
    };

    try {
      const immersiveResult = await searchService.search(immersiveRequest);
      if (immersiveResult.results && immersiveResult.results.length > 0) {
        const immersiveCandidates = processSearchResults(
          immersiveResult.results
        );

        const combinedCandidates = [...candidates, ...immersiveCandidates];
        identity = matchCandidates(currentProduct, combinedCandidates);
      }
      if (immersiveResult.errors) {
        errors.push(...immersiveResult.errors);
      }
    } catch (e) {
      console.error("Phase 2 Immersive Search failed:", e);
    }
  }

  // 8. Execute Ranking Pipeline on the final consolidated ProductIdentity (Phase 1 + Phase 2 offers)
  let rankedResult: RankedProductResult | undefined;
  try {
    const canonicalProduct = identityToCanonicalProduct(identity);
    const rankedPipeline = new RankedDiscoveryPipeline();
    const rankedResults = rankedPipeline.run([canonicalProduct]);
    rankedResult = rankedResults[0];
  } catch (rankingErr) {
    console.error("CartIntel Orchestrator: Ranking engine error.", rankingErr);
    errors.push({
      providerId: "ranking-engine",
      error: rankingErr instanceof Error ? rankingErr.message : String(rankingErr),
    });
  }

  console.log("[10] Offers normalized & ranked");

  return {
    identity,
    errors,
    rankedResult,
  };
}



