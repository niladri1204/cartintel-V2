import type { ProductIntelligence } from "../types";
import type {
  RecommendationRequest,
  RecommendationCandidate
} from "../recommendationTypes";
import type {
  ProductDecisionGroup,
  ProductDecisionResult
} from "./decisionTypes";
import { evaluateDecisionInputs, evaluateExplicitRequirement, evaluateUserPreference } from "./decisionEvaluator";

function calculateGroupRequirementScore(
  req: RecommendationRequest,
  candidateRep: RecommendationCandidate
): number {
  const reqs = req.explicitRequirements || [];
  if (reqs.length === 0) return 100;

  let totalWeight = 0;
  let achievedWeight = 0;

  for (const r of reqs) {
    const w = r.isMandatory !== false ? 2.0 : 1.0;
    totalWeight += w;
    const res = evaluateExplicitRequirement(r, candidateRep);
    if (res.status === "matched") {
      achievedWeight += w;
    }
  }

  return totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 100;
}

function calculateGroupPreferenceScore(
  req: RecommendationRequest,
  candidateRep: RecommendationCandidate
): number {
  const prefs = req.userPreferences || [];
  if (prefs.length === 0) return 100;

  let achieved = 0;
  for (const p of prefs) {
    const res = evaluateUserPreference(p, candidateRep);
    if (res.status === "strongly_matched") achieved += 1.0;
    else if (res.status === "partially_matched") achieved += 0.5;
  }

  return (achieved / prefs.length) * 100;
}

/**
 * Evaluates product-level decision intelligence independently of individual seller/offer pricing.
 * Groups candidates by canonical product fingerprint, aggregates multi-merchant evidence,
 * and determines the best product identity fit.
 *
 * @param request The RecommendationRequest.
 * @param candidates Optional explicit list of RecommendationCandidate items.
 * @returns ProductDecisionResult
 */
export function evaluateProductLevelDecisions(
  request: RecommendationRequest | null | undefined,
  candidates?: RecommendationCandidate[]
): ProductDecisionResult {
  const req: RecommendationRequest = request || { candidates: [] };
  const candList = candidates || req.candidates || [];

  if (candList.length === 0) {
    return {
      request: req,
      productGroups: [],
      bestProductGroup: null,
      productScore: 0,
      evaluatedProductCount: 0
    };
  }

  // Also evaluate offer-level hard constraint decision inputs to know which offers are eligible
  const evalResult = evaluateDecisionInputs(req, candList);
  const candidateEvalMap = new Map(evalResult.evaluations.map(e => [e.candidate, e]));

  // Group candidates by fingerprint
  const groupsMap = new Map<string, RecommendationCandidate[]>();

  for (const candidate of candList) {
    const fp = candidate.product?.fingerprint || candidate.product?.normalizedTitle || "unknown_product";
    if (!groupsMap.has(fp)) {
      groupsMap.set(fp, []);
    }
    groupsMap.get(fp)!.push(candidate);
  }

  const productGroups: ProductDecisionGroup[] = [];

  for (const [fingerprint, offers] of groupsMap.entries()) {
    // Representative offer: offer with highest identity confidence
    const sortedOffers = [...offers].sort(
      (a, b) => (b.identityConfidenceScore || 0) - (a.identityConfidenceScore || 0)
    );
    const representativeCandidate = sortedOffers[0];
    const product: ProductIntelligence = representativeCandidate.product || {
      originalTitle: null,
      originalPrice: null,
      originalCurrency: null,
      originalImage: null,
      originalUrl: null,
      brand: null,
      category: null,
      subcategory: null,
      productType: null,
      variant: null,
      quantity: null,
      unit: null,
      packSize: null,
      color: null,
      model: null,
      size: null,
      material: null,
      gender: null,
      storage: null,
      ram: null,
      packCount: null,
      language: null,
      edition: null,
      attributes: [],
      normalizedTitle: null,
      metadata: { marketplace: "Unknown", hostname: "", detectedAt: Date.now() },
      confidence: 0,
      fingerprint
    };

    // Cross-offer identity & marketplace evidence aggregation
    const bestIdentityConfidence = Math.max(...offers.map(c => c.identityConfidenceScore || 0));

    const marketplacesSet = new Set<string>();
    for (const offer of offers) {
      const mkt = offer.product?.metadata?.marketplace;
      if (mkt) marketplacesSet.add(mkt);
    }
    const marketplaces = Array.from(marketplacesSet);

    // Cross-offer price aggregation (only if currency is compatible)
    const validPriceOffers = offers.filter(
      c => c.product?.originalPrice != null && typeof c.product.originalPrice === "number" && c.product.originalCurrency
    );

    let lowestPrice: number | null = null;
    let highestPrice: number | null = null;
    let averagePrice: number | null = null;
    let currency: string | null = null;

    if (validPriceOffers.length > 0) {
      const currenciesSet = new Set(validPriceOffers.map(c => c.product!.originalCurrency));
      if (currenciesSet.size === 1) {
        currency = Array.from(currenciesSet)[0];
        const prices = validPriceOffers.map(c => c.product!.originalPrice!);
        lowestPrice = Math.min(...prices);
        highestPrice = Math.max(...prices);
        const sum = prices.reduce((a, b) => a + b, 0);
        averagePrice = Math.round(sum / prices.length);
      }
    }

    // Evaluate product-level fit (independent of seller price!)
    const reqFitRaw = calculateGroupRequirementScore(req, representativeCandidate);
    const prefFitRaw = calculateGroupPreferenceScore(req, representativeCandidate);

    const requirementFitScore = Math.round(reqFitRaw);
    const preferenceFitScore = Math.round(prefFitRaw);

    // Formula: productFitScore = 0.50 * requirementFitScore + 0.30 * preferenceFitScore + 0.20 * bestIdentityConfidence
    const rawFit = 0.50 * reqFitRaw + 0.30 * prefFitRaw + 0.20 * bestIdentityConfidence;
    const productFitScore = Math.round(Math.min(100, Math.max(0, rawFit)));

    // Product is eligible if AT LEAST ONE offer for this product is eligible
    const isEligible = offers.some(offer => {
      const evalData = candidateEvalMap.get(offer);
      return evalData ? evalData.eligibility === "eligible" : true;
    });

    productGroups.push({
      fingerprint,
      product,
      offers,
      bestIdentityConfidence,
      lowestPrice,
      highestPrice,
      averagePrice,
      currency,
      marketplaces,
      productFitScore,
      requirementFitScore,
      preferenceFitScore,
      isEligible
    });
  }

  // Select bestProductGroup strictly from eligible products
  const eligibleGroups = productGroups.filter(g => g.isEligible);

  let bestProductGroup: ProductDecisionGroup | null = null;
  let productScore = 0;

  if (eligibleGroups.length > 0) {
    eligibleGroups.sort((a, b) => {
      if (b.productFitScore !== a.productFitScore) {
        return b.productFitScore - a.productFitScore;
      }
      if (b.bestIdentityConfidence !== a.bestIdentityConfidence) {
        return b.bestIdentityConfidence - a.bestIdentityConfidence;
      }
      return a.fingerprint.localeCompare(b.fingerprint); // Stable string tie-breaker
    });

    bestProductGroup = eligibleGroups[0];
    productScore = bestProductGroup.productFitScore;
  }

  return {
    request: req,
    productGroups,
    bestProductGroup,
    productScore,
    evaluatedProductCount: productGroups.length
  };
}
