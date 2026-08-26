import type {
  RecommendationRequest,
  RecommendationCandidate,
  RecommendationReason,
  DecisionTradeOff,
  DecisionAlternative,
  DecisionConfidenceDetails,
  DecisionMetadata,
  RecommendationResult,
  ProductOfferExplanationDetails
} from "../recommendationTypes";
import { selectBestRecommendation } from "./decisionIntelligence";
import { evaluateProductLevelDecisions } from "./productDecision";
import { evaluateOfferLevelDecisions } from "./offerDecision";
import type { ScoredCandidateEvaluation, ProductDecisionGroup, OfferDecisionResult } from "./decisionTypes";
import { compareProducts } from "../matching";
import type { ProductIntelligence } from "../types";

function calculateExtendedConfidence(
  candidate: RecommendationCandidate | null,
  topScore: number,
  runnerUpScore: number | null
): {
  confidence: "high" | "medium" | "low";
  confidenceDetails: DecisionConfidenceDetails | null;
} {
  if (!candidate || !candidate.product) {
    return {
      confidence: "low",
      confidenceDetails: {
        score: 0,
        factors: { dataCompleteness: 0, identityCertainty: 0, priceFreshness: 0 }
      }
    };
  }

  const prod = candidate.product;

  const fields = [
    prod.brand,
    prod.category,
    prod.model,
    prod.storage,
    prod.ram,
    prod.color,
    prod.size,
    prod.originalPrice
  ];
  const populatedCount = fields.filter(f => f != null && f !== "").length;
  const dataCompleteness = populatedCount / fields.length;

  const identityCertainty = typeof candidate.identityConfidenceScore === "number"
    ? Math.min(1.0, Math.max(0, candidate.identityConfidenceScore / 100))
    : 0;

  const priceFreshness = typeof prod.originalPrice === "number" && prod.originalPrice > 0 ? 1.0 : 0;

  // Calculate decision score separation factor
  let scoreSeparation = 1.0;
  if (runnerUpScore != null) {
    const diff = topScore - runnerUpScore;
    if (diff >= 15) scoreSeparation = 1.0;
    else if (diff >= 5) scoreSeparation = 0.7;
    else scoreSeparation = 0.4;
  }

  const avgScore = 0.30 * dataCompleteness + 0.30 * identityCertainty + 0.20 * priceFreshness + 0.20 * scoreSeparation;
  const roundedScore = Math.round(avgScore * 100) / 100;

  let confidence: "high" | "medium" | "low" = "low";
  if (roundedScore >= 0.8) confidence = "high";
  else if (roundedScore >= 0.5) confidence = "medium";

  return {
    confidence,
    confidenceDetails: {
      score: roundedScore,
      factors: {
        dataCompleteness: Math.round(dataCompleteness * 100) / 100,
        identityCertainty: Math.round(identityCertainty * 100) / 100,
        priceFreshness
      }
    }
  };
}

function generateProductReasons(
  topEval: ScoredCandidateEvaluation | undefined,
  productGroup: ProductDecisionGroup | null
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];
  if (!topEval || !productGroup) return reasons;

  // 1. Matched Explicit Requirements (Product-level fit)
  const matchedReqs = topEval.explicitRequirementEvaluations.filter(e => e.status === "matched");
  if (matchedReqs.length > 0) {
    const summary = matchedReqs.map(e => `${e.requirement.attribute}: ${e.requirement.value}`).join(", ");
    reasons.push({
      type: "custom",
      message: `Product satisfies requested explicit requirements (${summary})`,
      scoreImpact: 30
    });
  }

  // 2. Matched Soft Preferences (Product-level fit)
  const matchedPrefs = topEval.preferenceEvaluations.filter(
    e => e.status === "strongly_matched" || e.status === "partially_matched"
  );
  if (matchedPrefs.length > 0) {
    const summary = matchedPrefs.map(e => `${e.preference.key}: ${e.preference.value}`).join(", ");
    reasons.push({
      type: "preference_match",
      message: `Product matches user preference goals (${summary})`,
      scoreImpact: 20
    });
  }

  // 3. High Product Identity Confidence
  if (productGroup.bestIdentityConfidence >= 80) {
    const brandStr = productGroup.product?.brand || "Verified model";
    reasons.push({
      type: "quality",
      message: `High canonical product identity certainty (${brandStr}, confidence: ${productGroup.bestIdentityConfidence}%)`,
      scoreImpact: 15
    });
  }

  return reasons;
}

function generateOfferReasons(
  topOffer: RecommendationCandidate,
  offerDecision: OfferDecisionResult
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];
  const prod = topOffer.product;

  // 1. Price Competitiveness & Savings
  const price = prod?.originalPrice;
  const curr = prod?.originalCurrency || "INR";

  if (price != null && typeof price === "number") {
    if (offerDecision.cheapestOffer && topOffer === offerDecision.cheapestOffer) {
      reasons.push({
        type: "price",
        message: `Cheapest available offer at ${curr} ${price}`,
        scoreImpact: 25
      });
    } else if (offerDecision.cheapestOffer?.product?.originalPrice) {
      const minP = offerDecision.cheapestOffer.product.originalPrice;
      const diff = price - minP;
      reasons.push({
        type: "price",
        message: `Priced at ${curr} ${price} (+${curr} ${diff} above lowest candidate listing)`,
        scoreImpact: 15
      });
    } else {
      reasons.push({
        type: "price",
        message: `Available at verified listing price of ${curr} ${price}`,
        scoreImpact: 15
      });
    }
  }

  // 2. Merchant & Marketplace Reliability
  const relScore = topOffer.marketplaceReliabilityScore || 0;
  if (relScore >= 80) {
    const mkt = prod?.metadata?.marketplace || "recognized marketplace";
    reasons.push({
      type: "reputation",
      message: `Top seller reliability score from ${mkt} (${relScore}/100)`,
      scoreImpact: 25
    });
  }

  // 3. Offer Quality & Availability
  const qualScore = topOffer.qualityScore || 0;
  const availScore = topOffer.priceAvailabilityScore || 0;
  if (qualScore >= 80 || availScore >= 80) {
    reasons.push({
      type: "availability",
      message: `High listing quality score (${qualScore}) and verified in-stock availability`,
      scoreImpact: 20
    });
  }

  return reasons;
}

function generateDecisionAwareTradeOffs(
  topEval: ScoredCandidateEvaluation,
  runnerUpEval: ScoredCandidateEvaluation | undefined,
  offerDecision: OfferDecisionResult
): DecisionTradeOff[] {
  const tradeOffs: DecisionTradeOff[] = [];
  const topCand = topEval.candidate;
  const curr = topCand.product?.originalCurrency || "INR";

  // 1. Cheapest vs Best Value Offer Trade-Off
  if (
    offerDecision.cheapestOffer &&
    offerDecision.bestValueOffer &&
    offerDecision.cheapestOffer !== offerDecision.bestValueOffer
  ) {
    const cheapP = offerDecision.cheapestOffer.product?.originalPrice;
    const valP = offerDecision.bestValueOffer.product?.originalPrice;
    if (cheapP != null && valP != null) {
      tradeOffs.push({
        aspect: "Cheapest vs Best Value Offer",
        positiveImpact: `Cheapest listing available at ${curr} ${cheapP}`,
        negativeImpact: `Best value listing costs ${curr} ${valP} but offers significantly higher merchant reliability and quality`
      });
    }
  }

  if (!runnerUpEval) return tradeOffs;
  const runnerCand = runnerUpEval.candidate;

  // 2. Price vs Merchant Quality Trade-Off
  const p1 = topCand.product?.originalPrice;
  const p2 = runnerCand.product?.originalPrice;
  const rel1 = topCand.marketplaceReliabilityScore || 0;
  const rel2 = runnerCand.marketplaceReliabilityScore || 0;

  if (p1 != null && p2 != null && p1 !== p2 && Math.abs(rel1 - rel2) >= 15) {
    if (p1 > p2 && rel1 > rel2) {
      tradeOffs.push({
        aspect: "Price vs Merchant Quality",
        positiveImpact: `Higher merchant reliability score (${rel1} vs ${rel2})`,
        negativeImpact: `Higher price (${curr} ${p1} vs ${curr} ${p2})`
      });
    } else if (p1 < p2 && rel1 < rel2) {
      tradeOffs.push({
        aspect: "Price vs Merchant Quality",
        positiveImpact: `Lower price (${curr} ${p1} vs ${curr} ${p2})`,
        negativeImpact: `Lower merchant reliability score (${rel1} vs ${rel2})`
      });
    }
  }

  // 3. Product Fit vs Offer Quality Trade-Off
  const fit1 = topEval.utilityBreakdown.requirementScore;
  const fit2 = runnerUpEval.utilityBreakdown.requirementScore;
  const rank1 = topEval.utilityBreakdown.rankingScoreComponent;
  const rank2 = runnerUpEval.utilityBreakdown.rankingScoreComponent;

  if (fit1 > fit2 && rank1 < rank2) {
    tradeOffs.push({
      aspect: "Product Fit vs Offer Quality",
      positiveImpact: "Stronger alignment with requested product specifications",
      negativeImpact: "Slightly lower offer ranking score"
    });
  }

  // 4. Ranking Evidence vs Price Trade-Off
  if (rank1 > rank2 && p1 != null && p2 != null && p1 > p2) {
    tradeOffs.push({
      aspect: "Ranking Evidence vs Price",
      positiveImpact: `Higher overall offer ranking score (${rank1} vs ${rank2})`,
      negativeImpact: `Higher price relative to alternative offer (${curr} ${p1} vs ${curr} ${p2})`
    });
  }

  return tradeOffs;
}

function cleanModelString(model: string | null | undefined): string {
  if (!model) return "";
  return model
    .toLowerCase()
    .replace(/\b(5g|4g|smartphone|phone|mobile)\b/gi, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameCanonicalProductIdentity(
  prodA: ProductIntelligence | null | undefined,
  prodB: ProductIntelligence | null | undefined
): boolean {
  if (!prodA || !prodB) return false;

  // 1. Exact canonical fingerprint equality
  if (prodA.fingerprint && prodB.fingerprint && prodA.fingerprint === prodB.fingerprint) {
    return true;
  }

  // 2. Normalize models for canonical comparison (stripping generic modifiers like 5G, Smartphone)
  const brandA = (prodA.brand || "").toLowerCase().trim();
  const brandB = (prodB.brand || "").toLowerCase().trim();
  const modelA = cleanModelString(prodA.model || prodA.originalTitle);
  const modelB = cleanModelString(prodB.model || prodB.originalTitle);

  if (brandA && brandB && brandA === brandB && modelA && modelB && modelA === modelB) {
    // Check for spec contradictions (e.g. 128gb vs 256gb)
    const storageA = (prodA.storage || "").toLowerCase().trim();
    const storageB = (prodB.storage || "").toLowerCase().trim();
    if (storageA && storageB && storageA !== storageB) {
      return false; // Storage contradiction -> different variant alternative
    }

    const ramA = (prodA.ram || "").toLowerCase().trim();
    const ramB = (prodB.ram || "").toLowerCase().trim();
    if (ramA && ramB && ramA !== ramB) {
      return false; // RAM contradiction -> different variant alternative
    }

    return true; // Brand and clean model match with no spec contradiction -> SAME PRODUCT IDENTITY
  }

  // 3. Fallback to High-confidence Product Matching Engine
  const matchResult = compareProducts(prodA, prodB);
  return matchResult.isMatch;
}

function generateTypedAlternatives(
  topEval: ScoredCandidateEvaluation,
  eligibleScored: ScoredCandidateEvaluation[]
): DecisionAlternative[] {
  const alternatives: DecisionAlternative[] = [];
  const topProduct = topEval.candidate.product;
  const runners = eligibleScored.filter(e => e.candidate !== topEval.candidate);

  for (const runner of runners.slice(0, 10)) {
    const runnerProduct = runner.candidate.product;

    if (isSameCanonicalProductIdentity(topProduct, runnerProduct)) {
      // It is the same canonical product (different offer or missing spec candidate).
      // Skip it to maintain strict Product vs Offer separation.
      continue;
    }

    const scoreDiff = Math.max(0, topEval.decisionScore - runner.decisionScore);
    const runnerBrand = runnerProduct?.brand || "Alternative";
    const runnerTitle = runnerProduct?.originalTitle || "Alternative product";

    alternatives.push({
      candidate: runner.candidate,
      comparisonMessage: `Alternative Product: ${runnerBrand} (${runnerTitle}) with decision score ${runner.decisionScore} (score diff: -${scoreDiff})`,
      scoreDifference: scoreDiff
    });

    if (alternatives.length >= 3) {
      break;
    }
  }

  return alternatives;
}

/**
 * Public Explainable Recommendation API (Phase 1.12.5.2).
 * Generates decision-aware explanations, trade-offs, extended confidence assessments,
 * product-vs-offer alternative distinction, and backward-compatible RecommendationResult contract.
 *
 * @param request The RecommendationRequest.
 * @param candidates Optional explicit list of RecommendationCandidate items.
 * @returns Complete RecommendationResult contract with productOfferDetails.
 */
export function buildExplainableRecommendation(
  request: RecommendationRequest | null | undefined,
  candidates?: RecommendationCandidate[]
): RecommendationResult {
  const startTime = Date.now();

  const productDecision = evaluateProductLevelDecisions(request, candidates);
  const offerDecision = evaluateOfferLevelDecisions(request, productDecision.bestProductGroup, candidates);
  const selResult = selectBestRecommendation(request, candidates);

  const eligibleScored = selResult.scoredEvaluations.filter(e => e.eligibility === "eligible");
  const topEval = selResult.scoredEvaluations.find(e => e.candidate === selResult.recommendedCandidate);
  const runnerUpEval = eligibleScored.find(e => e.candidate !== selResult.recommendedCandidate);

  const runnerUpScore = runnerUpEval ? runnerUpEval.decisionScore : null;
  const { confidence, confidenceDetails } = calculateExtendedConfidence(
    selResult.recommendedCandidate,
    selResult.recommendationScore,
    runnerUpScore
  );

  let reasons: RecommendationReason[] = [];
  let tradeOffs: DecisionTradeOff[] = [];
  let alternatives: DecisionAlternative[] = [];
  let productOfferDetails: ProductOfferExplanationDetails | undefined;

  if (topEval && selResult.recommendedCandidate !== null) {
    const productReasons = generateProductReasons(topEval, productDecision.bestProductGroup);
    const offerReasons = generateOfferReasons(selResult.recommendedCandidate, offerDecision);

    reasons = [...productReasons, ...offerReasons];
    tradeOffs = generateDecisionAwareTradeOffs(topEval, runnerUpEval, offerDecision);
    alternatives = generateTypedAlternatives(topEval, eligibleScored);

    const bestProdTitle = productDecision.bestProductGroup?.product?.originalTitle || productDecision.bestProductGroup?.product?.brand || "Canonical Product";
    const bestMkt = selResult.recommendedCandidate.product?.metadata?.marketplace || "Merchant";
    const bestPrice = selResult.recommendedCandidate.product?.originalPrice;
    const curr = selResult.recommendedCandidate.product?.originalCurrency || "INR";

    const cheapestMkt = offerDecision.cheapestOffer?.product?.metadata?.marketplace || "Merchant";
    const cheapestPrice = offerDecision.cheapestOffer?.product?.originalPrice;

    const valueMkt = offerDecision.bestValueOffer?.product?.metadata?.marketplace || "Merchant";
    const valuePrice = offerDecision.bestValueOffer?.product?.originalPrice;

    productOfferDetails = {
      productReasons,
      offerReasons,
      bestProductSummary: `Best product: ${bestProdTitle} (product fit score: ${productDecision.productScore}/100)`,
      bestOfferSummary: `Best offer: ${bestMkt} at ${curr} ${bestPrice || "N/A"}`,
      cheapestOfferSummary: offerDecision.cheapestOffer ? `Cheapest offer: ${cheapestMkt} at ${curr} ${cheapestPrice || "N/A"}` : undefined,
      bestValueOfferSummary: offerDecision.bestValueOffer ? `Best value offer: ${valueMkt} at ${curr} ${valuePrice || "N/A"}` : undefined
    };
  }

  const executionTimeMs = Math.max(1, Date.now() - startTime);

  const metadata: DecisionMetadata = {
    evaluatedCandidateCount: selResult.evaluatedCount,
    decisionAlgorithmVersion: "1.12.3",
    processedAt: Date.now(),
    executionTimeMs
  };

  return {
    recommendedCandidate: selResult.recommendedCandidate,
    recommendationScore: selResult.recommendationScore,
    confidence,
    confidenceDetails,
    reasons,
    tradeOffs,
    alternatives,
    metadata,
    productOfferDetails,
    bestOffer: offerDecision.bestOffer,
    cheapestOffer: offerDecision.cheapestOffer,
    bestValueOffer: offerDecision.bestValueOffer,
    allEligibleOffers: offerDecision.allEligibleOffers || [],
    allOffers: offerDecision.allEligibleOffers || [],
    offers: offerDecision.allEligibleOffers || []
  };
}
