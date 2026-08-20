import type {
  RecommendationRequest,
  RecommendationCandidate
} from "../recommendationTypes";
import type {
  DecisionUtilityBreakdown,
  DecisionTradeOff,
  ScoredCandidateEvaluation,
  DecisionSelectionResult,
  CandidateDecisionEvaluation
} from "./decisionTypes";
import { evaluateDecisionInputs } from "./decisionEvaluator";
import { evaluateElectronicsOfferValue } from "../valueIntelligence";

function calculateRequirementScore(evalData: CandidateDecisionEvaluation): number {
  const reqEvals = evalData.explicitRequirementEvaluations;
  if (!reqEvals || reqEvals.length === 0) return 100;

  let totalWeight = 0;
  let achievedWeight = 0;

  for (const re of reqEvals) {
    const w = re.requirement.isMandatory !== false ? 2.0 : 1.0;
    totalWeight += w;
    if (re.status === "matched") {
      achievedWeight += w;
    }
  }

  return totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 100;
}

function calculatePreferenceScore(evalData: CandidateDecisionEvaluation): number {
  const prefEvals = evalData.preferenceEvaluations;
  if (!prefEvals || prefEvals.length === 0) return 100;

  let total = prefEvals.length;
  let achieved = 0;

  for (const pe of prefEvals) {
    if (pe.status === "strongly_matched") achieved += 1.0;
    else if (pe.status === "partially_matched") achieved += 0.5;
  }

  return (achieved / total) * 100;
}

function calculateValueScore(
  candidate: RecommendationCandidate,
  allCandidates: RecommendationCandidate[],
  request?: RecommendationRequest | null
): number {
  const price = candidate.product?.originalPrice;
  const currency = candidate.product?.originalCurrency;

  if (price == null || typeof price !== "number" || !currency) {
    return candidate.priceAvailabilityScore || 50;
  }

  // Find same-currency candidates to determine relative price position
  const sameCurrencyPrices = allCandidates
    .map(c => (c.product?.originalCurrency === currency ? c.product?.originalPrice : null))
    .filter((p): p is number => p != null && typeof p === "number");

  let priceScore = candidate.priceAvailabilityScore || 75;
  if (sameCurrencyPrices.length > 1) {
    const minPrice = Math.min(...sameCurrencyPrices);
    const maxPrice = Math.max(...sameCurrencyPrices);
    if (maxPrice !== minPrice) {
      const relativeRatio = (maxPrice - price) / (maxPrice - minPrice);
      priceScore = Math.round(50 + 50 * relativeRatio);
    }
  }

  if (candidate.product?.category === "Electronics" && request) {
    const merchantScore = candidate.marketplaceReliabilityScore || 50;
    const qualityScore = candidate.qualityScore || 50;
    const rankingScore = Math.min(100, Math.max(0, candidate.finalRankingScore || 50));
    const qualityReputationScore = 0.40 * merchantScore + 0.35 * qualityScore + 0.25 * rankingScore;
    const baseValueScore = 0.60 * qualityReputationScore + 0.40 * priceScore;

    const assessment = evaluateElectronicsOfferValue(
      candidate,
      request,
      allCandidates,
      baseValueScore,
      priceScore
    );
    return assessment.overallValueScore;
  }

  // Fallback: Phase 1 relative price score
  if (sameCurrencyPrices.length <= 1) {
    return candidate.priceAvailabilityScore || 75;
  }
  const minPrice = Math.min(...sameCurrencyPrices);
  const maxPrice = Math.max(...sameCurrencyPrices);
  if (maxPrice === minPrice) return 75;
  const relativeRatio = (maxPrice - price) / (maxPrice - minPrice);
  return Math.round(50 + 50 * relativeRatio);
}

function detectTradeOffsBetweenTopCandidates(
  top: ScoredCandidateEvaluation,
  runnerUp: ScoredCandidateEvaluation
): DecisionTradeOff[] {
  const tradeOffs: DecisionTradeOff[] = [];

  const p1 = top.candidate.product?.originalPrice;
  const p2 = runnerUp.candidate.product?.originalPrice;
  const curr1 = top.candidate.product?.originalCurrency;
  const curr2 = runnerUp.candidate.product?.originalCurrency;

  if (p1 != null && p2 != null && curr1 === curr2 && p1 !== p2) {
    if (p1 < p2) {
      tradeOffs.push({
        aspect: "Price vs Specification",
        positiveImpact: `Selected candidate is lower priced (${curr1} ${p1})`,
        negativeImpact: `Runner-up candidate costs more (${curr2} ${p2})`
      });
    } else {
      tradeOffs.push({
        aspect: "Price vs Specification",
        positiveImpact: `Selected candidate offers higher feature fit`,
        negativeImpact: `Selected candidate is higher priced (${curr1} ${p1} vs ${curr2} ${p2})`
      });
    }
  }

  const pref1 = top.utilityBreakdown.preferenceScore;
  const pref2 = runnerUp.utilityBreakdown.preferenceScore;
  if (Math.abs(pref1 - pref2) > 10) {
    if (pref1 > pref2) {
      tradeOffs.push({
        aspect: "Preference Fit",
        positiveImpact: "Stronger alignment with user preferences",
        negativeImpact: "Runner-up has lower preference match"
      });
    }
  }

  const rank1 = top.utilityBreakdown.rankingScoreComponent;
  const rank2 = runnerUp.utilityBreakdown.rankingScoreComponent;
  if (Math.abs(rank1 - rank2) > 10) {
    if (rank1 > rank2) {
      tradeOffs.push({
        aspect: "Merchant & Offer Quality",
        positiveImpact: "Higher merchant reliability and offer ranking score",
        negativeImpact: "Runner-up has lower overall ranking score"
      });
    }
  }

  return tradeOffs;
}

/**
 * Core Decision Intelligence & Selection API.
 * Scores evaluated candidates using a deterministic decision utility model,
 * identifies trade-offs, and selects the recommended candidate.
 *
 * @param request The RecommendationRequest.
 * @param candidates Optional explicit list of RecommendationCandidate items.
 * @returns DecisionSelectionResult
 */
export function selectBestRecommendation(
  request: RecommendationRequest | null | undefined,
  candidates?: RecommendationCandidate[]
): DecisionSelectionResult {
  const baseResult = evaluateDecisionInputs(request, candidates);
  const candList = baseResult.evaluations.map(e => e.candidate);

  const scoredEvaluations: ScoredCandidateEvaluation[] = [];

  for (const evalData of baseResult.evaluations) {
    const { candidate, eligibility } = evalData;

    // Hard constraints dominate: ineligible candidates get final decision score 0
    if (eligibility === "ineligible") {
      const breakdown: DecisionUtilityBreakdown = {
        eligibilityScore: 0,
        requirementScore: calculateRequirementScore(evalData),
        preferenceScore: calculatePreferenceScore(evalData),
        rankingScoreComponent: Math.min(100, Math.max(0, candidate.finalRankingScore || 0)),
        valueScore: calculateValueScore(candidate, candList, request),
        finalDecisionScore: 0
      };
      scoredEvaluations.push({
        ...evalData,
        utilityBreakdown: breakdown,
        decisionScore: 0,
        tradeOffs: []
      });
      continue;
    }

    const reqScore = calculateRequirementScore(evalData);
    const prefScore = calculatePreferenceScore(evalData);
    const valScore = calculateValueScore(candidate, candList, request);
    const rankScore = Math.min(100, Math.max(0, candidate.finalRankingScore || 0));

    // Eligibility component score: 1.0 for eligible, 0.5 for unknown
    const eligScoreComp = eligibility === "eligible" ? 1.0 : 0.5;

    // Decision utility weights: Requirement 30%, Price/Value 25%, Ranking 25%, Preference 20%
    let rawScore = 0.30 * reqScore + 0.25 * valScore + 0.25 * rankScore + 0.20 * prefScore;

    // If eligibility is unknown (missing required hard constraint data), apply uncertainty discount factor (0.7x)
    if (eligibility === "unknown") {
      rawScore *= 0.7;
    }

    const finalDecisionScore = Math.round(Math.min(100, Math.max(0, rawScore)));

    const breakdown: DecisionUtilityBreakdown = {
      eligibilityScore: eligScoreComp,
      requirementScore: Math.round(reqScore),
      preferenceScore: Math.round(prefScore),
      rankingScoreComponent: Math.round(rankScore),
      valueScore: Math.round(valScore),
      finalDecisionScore
    };

    scoredEvaluations.push({
      ...evalData,
      utilityBreakdown: breakdown,
      decisionScore: finalDecisionScore,
      tradeOffs: []
    });
  }

  // Filter ONLY eligible candidates for winning selection (ineligible & unknown cannot win over eligible)
  const eligibleScored = scoredEvaluations.filter(e => e.eligibility === "eligible");

  let recommendedCandidate: RecommendationCandidate | null = null;
  let recommendationScore = 0;
  let topTradeOffs: DecisionTradeOff[] = [];

  if (eligibleScored.length > 0) {
    // Sort by decisionScore DESC, then finalRankingScore DESC, then original array sequence
    eligibleScored.sort((a, b) => {
      if (b.decisionScore !== a.decisionScore) {
        return b.decisionScore - a.decisionScore;
      }
      const rA = a.candidate.finalRankingScore || 0;
      const rB = b.candidate.finalRankingScore || 0;
      if (rB !== rA) {
        return rB - rA;
      }
      return 0; // Maintain stable sequence
    });

    const top = eligibleScored[0];
    recommendedCandidate = top.candidate;
    recommendationScore = top.decisionScore;

    if (eligibleScored.length > 1) {
      const runnerUp = eligibleScored[1];
      topTradeOffs = detectTradeOffsBetweenTopCandidates(top, runnerUp);
      top.tradeOffs = topTradeOffs;
    }
  }

  return {
    ...baseResult,
    scoredEvaluations,
    recommendedCandidate,
    recommendationScore,
    tradeOffs: topTradeOffs
  };
}
