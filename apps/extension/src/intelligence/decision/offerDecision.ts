import type {
  RecommendationRequest,
  RecommendationCandidate
} from "../recommendationTypes";
import type {
  ProductDecisionGroup,
  OfferDecisionResult
} from "./decisionTypes";
import { evaluateDecisionInputs } from "./decisionEvaluator";
import { evaluateElectronicsOfferValue } from "../valueIntelligence";
import { areModelsMatching } from "../matching";
import { ProductDomain, inferDomain } from "../domain";

function getNumericPrice(candidate: RecommendationCandidate): number | null {
  const p = candidate.product?.originalPrice;
  if (p == null) return null;
  if (typeof p === "number") return isNaN(p) || p <= 0 ? null : p;
  if (typeof p === "string") {
    const parsed = parseFloat((p as string).replace(/[^0-9.]/g, ""));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  }
  return null;
}

function normalizeIdentityPart(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isSameCanonicalOfferFamily(
  anchor: RecommendationCandidate["product"] | null | undefined,
  candidate: RecommendationCandidate["product"] | null | undefined
): boolean {
  if (!anchor || !candidate) return false;

  const anchorBrand = normalizeIdentityPart(anchor.brand);
  const candidateBrand = normalizeIdentityPart(candidate.brand);

  if (!anchorBrand || !candidateBrand || anchorBrand !== candidateBrand) {
    return false;
  }

  if (!anchor.model || !candidate.model || !areModelsMatching(anchor.model, candidate.model, anchor.brand)) {
    return false;
  }

  // Only enforce storage when BOTH sides explicitly know storage.
  const anchorStorage = normalizeIdentityPart(anchor.storage);
  const candidateStorage = normalizeIdentityPart(candidate.storage);

  if (
    anchorStorage &&
    candidateStorage &&
    anchorStorage !== candidateStorage
  ) {
    return false;
  }

  // RAM is enforced only when the anchor explicitly specifies RAM.
  const anchorRam = normalizeIdentityPart(anchor.ram);
  const candidateRam = normalizeIdentityPart(candidate.ram);

  if (
    anchorRam &&
    candidateRam &&
    anchorRam !== candidateRam
  ) {
    return false;
  }

  return true;
}

/**
 * Evaluates offer-level decision intelligence for a selected canonical product group.
 * Identifies bestOffer, cheapestOffer, and bestValueOffer as separate evidence-based selections.
 *
 * @param request The RecommendationRequest.
 * @param productGroup The selected ProductDecisionGroup.
 * @param candidates Optional explicit list of RecommendationCandidate items.
 * @returns OfferDecisionResult
 */
export function evaluateOfferLevelDecisions(
  request: RecommendationRequest | null | undefined,
  productGroup: ProductDecisionGroup | null | undefined,
  candidates?: RecommendationCandidate[]
): OfferDecisionResult {
  const req: RecommendationRequest = request || { candidates: [] };

  if (!productGroup || !productGroup.offers || productGroup.offers.length === 0) {
    return {
      request: req,
      productGroup: productGroup || null,
      bestOffer: null,
      cheapestOffer: null,
      bestValueOffer: null,
      allEligibleOffers: [],
      allOffers: [],
      eligibleOfferCount: 0,
      evaluatedOfferCount: 0
    };
  }

  // Filter candidates belonging to the selected canonical offer family
  const pool = candidates || productGroup.offers;
  const anchorOffer =
    productGroup.offers[0] ||
    pool[0] ||
    null;

  const productOffers = anchorOffer
    ? pool.filter(candidate =>
        isSameCanonicalOfferFamily(
          anchorOffer.product,
          candidate.product
        )
      )
    : [];

  const targetOffers =
    productOffers.length > 0
      ? productOffers
      : productGroup.offers;

  // Evaluate hard-constraint eligibility: ineligible offers can NEVER win any selection
  const evalResult = evaluateDecisionInputs(req, targetOffers);
  const eligibleEvals = evalResult.evaluations.filter(e => e.eligibility === "eligible");
  const eligibleOffers = eligibleEvals.map(e => e.candidate);

  if (eligibleOffers.length === 0) {
    return {
      request: req,
      productGroup,
      bestOffer: null,
      cheapestOffer: null,
      bestValueOffer: null,
      allEligibleOffers: [],
      allOffers: [],
      eligibleOfferCount: 0,
      evaluatedOfferCount: targetOffers.length
    };
  }

  // 1. Compute cheapestOffer (lowest comparable price among eligible offers)
  const validPriceOffers = eligibleOffers.filter(c => {
    const price = getNumericPrice(c);
    return price != null && Boolean(c.product?.originalCurrency);
  });

  let cheapestOffer: RecommendationCandidate | null = null;
  let primaryCurrency: string | null = null;
  let minPrice = Infinity;
  let sameCurrencyOffers: RecommendationCandidate[] = [];

  if (validPriceOffers.length > 0) {
    // Group prices by currency; select majority currency
    const currencyCounts = new Map<string, number>();
    for (const c of validPriceOffers) {
      const curr = c.product!.originalCurrency!.toUpperCase().trim();
      currencyCounts.set(curr, (currencyCounts.get(curr) || 0) + 1);
    }
    primaryCurrency = Array.from(currencyCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];

    sameCurrencyOffers = validPriceOffers.filter(
      c => c.product?.originalCurrency?.toUpperCase().trim() === primaryCurrency
    );

    if (sameCurrencyOffers.length > 0) {
      const prices = sameCurrencyOffers.map(c => getNumericPrice(c)!);
      minPrice = Math.min(...prices);

      const sortedCheapest = [...sameCurrencyOffers].sort((a, b) => {
        const pA = getNumericPrice(a)!;
        const pB = getNumericPrice(b)!;
        if (pA !== pB) return pA - pB;
        const relA = a.marketplaceReliabilityScore || 0;
        const relB = b.marketplaceReliabilityScore || 0;
        if (relB !== relA) return relB - relA;
        return (b.finalRankingScore || 0) - (a.finalRankingScore || 0);
      });
      cheapestOffer = sortedCheapest[0];
    }
  }

  if (!cheapestOffer) {
    cheapestOffer = eligibleOffers[0];
  }

  // Helper: Relative price score (50 to 100)
  function getRelativePriceScore(candidate: RecommendationCandidate): number {
    const p = getNumericPrice(candidate);
    const curr = candidate.product?.originalCurrency ? candidate.product.originalCurrency.toUpperCase().trim() : null;
    if (p == null || curr !== primaryCurrency || minPrice === Infinity) {
      return candidate.priceAvailabilityScore || 75;
    }
    const deviation = (p - minPrice) / minPrice;
    const score = Math.max(50, Math.round(100 - 100 * deviation));
    return score;
  }

  // Filter eligible offers to those matching the primary currency for fair comparison
  const comparableOffers = sameCurrencyOffers.length > 0 ? sameCurrencyOffers : eligibleOffers;

  // 2. Compute bestOffer using price-dominant scoring
  const scoredBestOffers = comparableOffers.map(candidate => {
    const priceScore = getRelativePriceScore(candidate);
    const merchantScore = candidate.marketplaceReliabilityScore || 50;
    const rankingScore = Math.min(100, Math.max(0, candidate.finalRankingScore || 50));
    const qualityScore = candidate.qualityScore || 50;

    const titleLower = (candidate.product?.originalTitle || "").toLowerCase();
    const hasWarrantyBonus = titleLower.includes("official warranty") || titleLower.includes("manufacturer warranty") || (candidate.product?.confidence || 0) >= 98;
    const warrantyBonus = hasWarrantyBonus ? 3 : 0;

    const overallScore =
      0.55 * priceScore +
      0.20 * merchantScore +
      0.15 * qualityScore +
      0.10 * rankingScore +
      warrantyBonus;

    return { candidate, overallScore, rankingScore, merchantScore };
  });

  scoredBestOffers.sort((a, b) => {
    if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
    if (b.merchantScore !== a.merchantScore) return b.merchantScore - a.merchantScore;
    return b.rankingScore - a.rankingScore;
  });

  const bestOffer = scoredBestOffers[0].candidate;

  // 3. Compute bestValueOffer (distinct from cheapestOffer: 60% quality/reputation + 40% price efficiency)
  const scoredValueOffers = comparableOffers.map(candidate => {
    const priceScore = getRelativePriceScore(candidate);
    const merchantScore = candidate.marketplaceReliabilityScore || 50;
    const qualityScore = candidate.qualityScore || 50;
    const rankingScore = Math.min(100, Math.max(0, candidate.finalRankingScore || 50));

    // Quality/reputation component
    const qualityReputationScore = 0.40 * merchantScore + 0.35 * qualityScore + 0.25 * rankingScore;

    // Value score balances high quality/reputation with price efficiency
    let valueScore = 0.50 * qualityReputationScore + 0.50 * priceScore;

    const candDomain = candidate.product?.domain || (candidate.product ? inferDomain(candidate.product.category, candidate.product.normalizedTitle) : null);
    if (candDomain === ProductDomain.Electronics || candidate.product?.category === "Electronics" || candidate.product?.category?.toLowerCase() === "smartphone") {
      const assessment = evaluateElectronicsOfferValue(
        candidate,
        req,
        comparableOffers,
        valueScore,
        priceScore
      );
      valueScore = assessment.overallValueScore;
    }

    return { candidate, valueScore, qualityReputationScore };
  });

  scoredValueOffers.sort((a, b) => {
    if (b.valueScore !== a.valueScore) return b.valueScore - a.valueScore;
    return b.qualityReputationScore - a.qualityReputationScore;
  });

  const bestValueOffer = scoredValueOffers[0].candidate;

  return {
    request: req,
    productGroup,
    bestOffer,
    cheapestOffer,
    bestValueOffer,
    allEligibleOffers: eligibleOffers,
    allOffers: eligibleOffers,
    eligibleOfferCount: eligibleOffers.length,
    evaluatedOfferCount: targetOffers.length
  };
}
