import type { ProductIntelligence } from "./types";
import { processSearchResults } from "../services/search/mapper";
import { matchCandidates } from "./integration";
import type { ProviderError } from "../services/search/types";
import type { ProductIdentity } from "./resolver";

import { CartIntelDiscoveryProvider } from "../services/search/CartIntelDiscoveryProvider";
import { DiscoveryEngine } from "../services/search/discoveryEngine";
import { ensureMerchantCoverage, computeMerchantCoverage, classifyMerchantTier } from "./merchantCoverage";
import type { SearchQueryInput } from "../services/search/queryGenerator";
import type { RecommendationCandidate, RecommendationResult } from "./recommendationTypes";
import { buildExplainableRecommendation } from "./decision/decisionExplanation";
import { buildRecommendationRequest } from "./intent/recommendationRequestBuilder";
import { isRefurbishedOrUsedProduct, evaluateVariantState } from "./ranking";
import { emitOfferTrace } from "../utils/terminalTrace";
import { getApiBaseUrl } from "../config/api";

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

  emitOfferTrace("1. After Serper results are mapped", candidates);

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
  emitOfferTrace("2. After deduplication", dedupedCandidates);

  // 6. Resolve the clustered identity (Phase 1 matching)
  let identity = matchCandidates(currentProduct, dedupedCandidates);
  emitOfferTrace("3. After matchCandidates()", identity.products);

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

      const mktTier = classifyMerchantTier(p.metadata?.marketplace || (p as any).source).tier;
      const defaultMerchantScore = mktTier === 1 ? 95 : mktTier === 2 ? 85 : mktTier === 3 ? 70 : 40;

      return {
        product: p,
        isCurrentProduct: normalizeUrl(p.originalUrl) === normalizeUrl(currentProduct.originalUrl),
        variantState: evaluateVariantState(currentProduct, p),
        isRefurbishedOrUsed: isRefurb,
        isUnavailable: false,
        savingsValue: null,
        savingsPercentage: null,
        currencyMismatch: false,
        finalRankingScore: (p as any).finalRankingScore ?? (p.confidence ? Math.min(100, Math.max(50, p.confidence)) : 80),
        priceAvailabilityScore: (p as any).priceAvailabilityScore ?? 80,
        identityConfidenceScore: p.confidence || 90,
        qualityScore: (p as any).qualityScore ?? 80,
        marketplaceReliabilityScore: (p as any).marketplaceReliabilityScore ?? defaultMerchantScore,
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

    // 7. Direct Merchant URL Resolution on Matched Candidates
    //    Enriches missing merchant URLs via at most ONE targeted organic search before final decision
    if (recCandidates.length > 0) {
      await discoveryProvider.resolveMerchantUrls(recCandidates, currentProduct);
    }

    // 8. Execute Authoritative Decision Engine Pipeline (Phase 1.12)
    const recResult = buildExplainableRecommendation(req, recCandidates);
    decisionRecommendation = recResult;

    // 9. Asynchronous Persistence Dispatch (Non-blocking Phase 6.3)
    dispatchPersistenceAsync(currentProduct, recResult);
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

function dispatchPersistenceAsync(
  currentProduct: ProductIntelligence,
  recResult: RecommendationResult
): void {
  try {
    const baseUrl = getApiBaseUrl();

    const offersToPersist: any[] = [];
    const allOffers = recResult.allEligibleOffers || [];

    for (const c of allOffers) {
      const p = c.product;
      if (!p || !p.originalUrl) continue;

      let role = "eligible";
      if (c === recResult.cheapestOffer && c === recResult.bestValueOffer) role = "both";
      else if (c === recResult.cheapestOffer) role = "cheapest";
      else if (c === recResult.bestValueOffer) role = "best_value";

      let hostname = "";
      try {
        hostname = (
          p.metadata?.hostname ||
          new URL(p.originalUrl).hostname
        ).trim().toLowerCase().replace(/^www\./, "");
      } catch {
        hostname = (p.metadata?.hostname || "").trim().toLowerCase().replace(/^www\./, "");
      }

      offersToPersist.push({
        merchantName: p.metadata?.marketplace || (p as any).source || hostname || "Merchant",
        merchantHostname: hostname,
        merchantDomain: hostname,
        brandName: p.brand || null,
        productTitle: p.normalizedTitle || p.originalTitle || "Product",
        normalizedModel: p.model || p.productType || p.normalizedTitle || "Model",
        category: p.category || "General",
        productType: p.productType || null,
        canonicalFingerprint: p.fingerprint || `${p.brand || "generic"}|${p.model || p.normalizedTitle}`,
        color: p.color || null,
        storage: p.storage || null,
        ram: p.ram || null,
        size: p.size || null,
        originalTitle: p.originalTitle || p.normalizedTitle || "Listing",
        normalizedTitle: p.normalizedTitle || null,
        originalUrl: p.originalUrl.trim(),
        imageUrl: p.originalImage ?? null,
        currentPrice: p.originalPrice || 0,
        currency: p.originalCurrency || "INR",
        isAvailable: !c.isUnavailable,
        isRefurbished: c.isRefurbishedOrUsed ?? false,
        qualityScore: c.qualityScore ?? 80,
        marketplaceReliabilityScore: c.marketplaceReliabilityScore ?? 80,
        offerRole: role,
        rankingTier: null,
        finalScore: c.finalRankingScore ?? null,
      });
    }

    let cheapestKey: string | null = null;
    if (recResult.cheapestOffer?.product?.originalUrl) {
      const cheapUrl = recResult.cheapestOffer.product.originalUrl.trim();
      try {
        const cheapHost = (
          recResult.cheapestOffer.product.metadata?.hostname ||
          new URL(cheapUrl).hostname
        ).trim().toLowerCase().replace(/^www\./, "");
        cheapestKey = `${cheapHost}|${cheapUrl}`;
      } catch {
        cheapestKey = cheapUrl;
      }
    }

    let bestValueKey: string | null = null;
    if (recResult.bestValueOffer?.product?.originalUrl) {
      const valUrl = recResult.bestValueOffer.product.originalUrl.trim();
      try {
        const valHost = (
          recResult.bestValueOffer.product.metadata?.hostname ||
          new URL(valUrl).hostname
        ).trim().toLowerCase().replace(/^www\./, "");
        bestValueKey = `${valHost}|${valUrl}`;
      } catch {
        bestValueKey = valUrl;
      }
    }

    const payload = {
      sessionToken: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      queryText: currentProduct.normalizedTitle || currentProduct.originalTitle || "",
      status: "recommended",
      confidence: recResult.confidenceDetails?.score != null ? Math.round(recResult.confidenceDetails.score * 100) : 100,
      decisionReasons: recResult.reasons || [],
      tradeOffs: recResult.tradeOffs || [],
      anchorProduct: {
        brandName: currentProduct.brand || null,
        productTitle: currentProduct.normalizedTitle || currentProduct.originalTitle || "Anchor Product",
        normalizedModel: currentProduct.model || currentProduct.productType || currentProduct.normalizedTitle || "Anchor Model",
        category: currentProduct.category || "General",
        productType: currentProduct.productType || null,
        canonicalFingerprint: currentProduct.fingerprint || "anchor_fingerprint",
        color: currentProduct.color || null,
        storage: currentProduct.storage || null,
        ram: currentProduct.ram || null,
        size: currentProduct.size || null,
        volumeValue: currentProduct.quantity ?? null,
        volumeUnit: currentProduct.unit ?? null,
        packCount: currentProduct.packCount || 1,
      },
      offers: offersToPersist,
      cheapestOfferMatchKey: cheapestKey,
      bestValueOfferMatchKey: bestValueKey,
    };

    if (typeof fetch !== "undefined") {
      fetch(`${baseUrl}/api/persist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn("[CartIntel Orchestrator] Non-blocking persistence notice:", err);
      });
    }
  } catch (err) {
    console.warn("[CartIntel Orchestrator] Non-blocking persistence dispatch error:", err);
  }
}



