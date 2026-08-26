import type { ProductIntelligence } from "./types";
import { processSearchResults } from "../services/search/mapper";
import { matchCandidates } from "./integration";
import type { ProviderError } from "../services/search/types";
import type { ProductIdentity } from "./resolver";

import { CartIntelDiscoveryProvider } from "../services/search/CartIntelDiscoveryProvider";
import { DiscoveryEngine } from "../services/search/discoveryEngine";
import { ensureMerchantCoverage, computeMerchantCoverage } from "./merchantCoverage";
import type { SearchQueryInput } from "../services/search/queryGenerator";
import type { RecommendationCandidate, RecommendationResult } from "./recommendationTypes";
import { buildExplainableRecommendation } from "./decision/decisionExplanation";
import { buildRecommendationRequest } from "./intent/recommendationRequestBuilder";
import { isRefurbishedOrUsedProduct, evaluateVariantState } from "./ranking";

function normalizeUrl(u?: string | null): string {
  if (!u) return "";
  try {
    const p = new URL(u);
    return p.origin + p.pathname;
  } catch {
    return u.trim();
  }
}

export interface ComparisonResult {
  identity: ProductIdentity;
  errors: ProviderError[];
  decisionRecommendation?: RecommendationResult;
}

/**
 * Orchestrates the single authoritative comparison pipeline:
 * 1. Fetches raw results via multi-query DiscoveryEngine & CartIntelDiscoveryProvider
 * 2. Maps raw results into ProductIntelligence using the core engine
 * 3. Resolves and matches candidates against the current product (Phase 1 matching)
 * 4. Executes Explainable Decision Engine (productDecision + offerDecision)
 * 5. Enriches final eligible offers with direct merchant URLs
 * 6. Returns the consolidated ProductIdentity, errors, and authoritative decisionRecommendation
 */
export async function compareProduct(
  currentProduct: ProductIntelligence
): Promise<ComparisonResult> {
  if (!currentProduct) {
    throw new Error("CartIntel Orchestrator: Cannot compare a null product.");
  }

  let visualCandidates: ProductIntelligence[] = [];

  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.sendMessage) {
    try {
      const visualResult = await new Promise<any>((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (tab?.id) {
            chrome.tabs.sendMessage(
              tab.id,
              { action: "run_visual_discovery", existingProductContext: currentProduct },
              (res) => {
                if (chrome.runtime.lastError) {
                  resolve(null);
                } else {
                  resolve(res);
                }
              }
            );
          } else {
            resolve(null);
          }
        });
      });
      console.log("[VisualTrace] orchestrator visual result:", visualResult ? visualResult.status : "null");

      if (
        visualResult &&
        visualResult.status !== "unavailable" &&
        visualResult.status !== "failed" &&
        Array.isArray(visualResult.matchedProducts)
      ) {
        visualCandidates = visualResult.matchedProducts;
        console.log(`[Visual] Acquired ${visualCandidates.length} visually matched candidate(s).`);
      }
    } catch (err) {
      console.error("[Visual] Failed to request visual discovery:", err);
    }
  }

  // 1. Convert ProductIntelligence to SearchQueryInput
  const queryInput: SearchQueryInput = {
    title: currentProduct.normalizedTitle || currentProduct.originalTitle || "",
    brand: currentProduct.brand,
    model: currentProduct.model,
    category: currentProduct.category,
    identifiers: {},
    attributes: {
      storage: currentProduct.storage ?? null,
      ram: currentProduct.ram ?? null,
      color: currentProduct.color ?? null,
      variant: currentProduct.variant ?? null,
      size: currentProduct.size ?? null,
    },
  };

  // 2. Instantiate DiscoveryEngine with CartIntelDiscoveryProvider
  const discoveryProvider = new CartIntelDiscoveryProvider();
  const discoveryEngine = new DiscoveryEngine(discoveryProvider);

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

  // 4. Map raw discovery results into ProductIntelligence candidates
  console.log(`[Diagnostic 4] Orchestrator passing to normalization: ${rawResults.length}`);
  const candidates = processSearchResults(rawResults);

  // Combine visual candidates and text candidates
  const combinedCandidates = [
    ...candidates,
    ...visualCandidates,
  ];

  const mergedMap = new Map<string, ProductIntelligence>();
  for (const candidate of combinedCandidates) {
    const merchant =
      candidate.metadata?.marketplace?.trim().toLowerCase() ||
      candidate.metadata?.hostname?.trim().toLowerCase() ||
      (candidate as any).source?.trim().toLowerCase() ||
      "unknown";

    const key = [
      candidate.fingerprint || candidate.normalizedTitle || "unknown",
      merchant,
      candidate.originalPrice ?? "unknown",
    ].join("|");

    const existing = mergedMap.get(key);
    if (!existing) {
      mergedMap.set(key, candidate);
    } else {
      // URL-preserving merge: preserve incoming valid URL if existing is empty
      if (!existing.originalUrl && candidate.originalUrl) {
        existing.originalUrl = candidate.originalUrl;
      } else if (
        existing.originalUrl &&
        candidate.originalUrl &&
        existing.originalUrl !== candidate.originalUrl
      ) {
        mergedMap.set(`${key}|${candidate.originalUrl}`, candidate);
      }
    }
  }
  const mergedCandidates = Array.from(mergedMap.values());

  // 5b. Ensure merchant diversity (post-dedup intra-merchant cleanup)
  const dedupedCandidates = ensureMerchantCoverage(mergedCandidates);

  // 6. Resolve the clustered identity (Phase 1 matching)
  let identity = matchCandidates(currentProduct, dedupedCandidates);

  // Offer Funnel Diagnostics
  const uniqueMerchants = Array.from(
    new Set(
      identity.products
        .map(p => p.metadata?.marketplace)
        .filter(Boolean)
    )
  );

  console.log(`[OfferFunnel] raw=${rawResults.length}`);
  console.log(`[OfferFunnel] mapped=${candidates.length}`);
  console.log(`[OfferFunnel] qualityEligible=${candidates.length}`);
  console.log(`[OfferFunnel] deduped=${dedupedCandidates.length}`);
  console.log(`[OfferFunnel] matched=${identity.products.length}`);
  console.log(`[OfferFunnel] merchants=${uniqueMerchants.length}`);
  console.log(
    `[OfferFunnelReject] identityMismatch=${Math.max(
      0,
      dedupedCandidates.length - identity.products.length
    )}`
  );

  // 5c. Compute coverage diagnostics
  computeMerchantCoverage(
    identity.products,
    rawResults.length,
    0,
    0,
    rawResults.length - identity.products.length
  );

  // 7. Execute Authoritative Decision Engine Pipeline (Phase 1.12)
  let decisionRecommendation: RecommendationResult | undefined;
  try {
    const rawProducts = identity.products || [];
    const isCurrentRefurbished = isRefurbishedOrUsedProduct(
      currentProduct?.originalTitle,
      currentProduct?.metadata?.marketplace
    );

    const recCandidates: RecommendationCandidate[] = rawProducts.map(p => {
      const isRefurb = isRefurbishedOrUsedProduct(
        p.originalTitle || p.normalizedTitle,
        p.metadata?.marketplace || (p as any).source
      );

      return {
        product: p,
        isCurrentProduct: normalizeUrl(p.originalUrl) === normalizeUrl(currentProduct.originalUrl),
        variantState: evaluateVariantState(currentProduct, p),
        isRefurbishedOrUsed: isRefurb,
        isUnavailable: false,
        savingsValue: null,
        savingsPercentage: null,
        currencyMismatch: false,
        finalRankingScore: (p as any).finalRankingScore ?? p.confidence ?? 0,
        priceAvailabilityScore: (p as any).priceAvailabilityScore ?? 0,
        identityConfidenceScore: p.confidence || 0,
        qualityScore: (p as any).qualityScore ?? 0,
        marketplaceReliabilityScore: (p as any).marketplaceReliabilityScore ?? 0,
        duplicateRedundancyScore: 0,
      };
    });

    const baseReq = buildRecommendationRequest(
      currentProduct.normalizedTitle || currentProduct.originalTitle || ""
    );

    const hardConstraints = [...(baseReq.hardConstraints || [])];
    if (!isCurrentRefurbished && !hardConstraints.some(h => h.attribute?.toLowerCase() === "condition")) {
      hardConstraints.push({
        attribute: "condition",
        operator: "equals",
        value: "new",
      });
    }

    const req = {
      ...baseReq,
      hardConstraints,
      candidates: recCandidates,
    };

    const recResult = buildExplainableRecommendation(req, recCandidates);

    // 8. Direct Merchant URL Resolution on Final Eligible Offers ONLY
    //    Enriches missing merchant URLs via at most ONE targeted organic search without altering candidate count
    const targetOffers = recResult.allEligibleOffers || [];
    if (targetOffers.length > 0) {
      await discoveryProvider.resolveMerchantUrls(targetOffers, currentProduct);
    }

    decisionRecommendation = recResult;
  } catch (recErr) {
    console.error("CartIntel Orchestrator: Decision engine error.", recErr);
    errors.push({
      providerId: "decision-engine",
      error: recErr instanceof Error ? recErr.message : String(recErr),
    });
  }

  console.log("[10] Offers normalized & decision-selected");

  return {
    identity,
    errors,
    decisionRecommendation,
  };
}



