import type { RecommendationRequest } from "../recommendationTypes";
import type {
  AlternativeProduct,
  RankedAlternativeProduct,
  AlternativeSelectionResult,
  ProductDecisionGroup
} from "./decisionTypes";
import { identifyAlternativeProducts } from "./alternativeProduct";
import { evaluateProductLevelDecisions } from "./productDecision";

/**
 * Ranks already-identified alternative products and selects the best alternative options
 * for the user without confusing them with the primary recommendation or seller offers.
 *
 * Primary ranking factors:
 * - similarityScore (40%)
 * - requirementFitScore (30%)
 * - preferenceFitScore (20%)
 * - identityConfidence (10%)
 * Zero seller price dependency.
 *
 * Deterministic tie-breaking:
 * 1. alternativeScore desc
 * 2. similarityScore desc
 * 3. identityConfidence desc
 * 4. fingerprint asc
 *
 * Returns maximum of 3 top-ranked alternatives.
 *
 * @param request RecommendationRequest.
 * @param alternatives Optional array of AlternativeProduct items.
 * @returns AlternativeSelectionResult.
 */
export function rankAlternativeProducts(
  request: RecommendationRequest | null | undefined,
  alternatives?: AlternativeProduct[]
): AlternativeSelectionResult {
  let recommendedProduct: ProductDecisionGroup | null = null;
  let candidateAlternatives: AlternativeProduct[] = [];

  if (alternatives !== undefined) {
    candidateAlternatives = alternatives;
    const prodRes = evaluateProductLevelDecisions(request, request?.candidates || undefined);
    recommendedProduct = prodRes.bestProductGroup;
  } else {
    const altResult = identifyAlternativeProducts(request);
    recommendedProduct = altResult.recommendedProduct;
    candidateAlternatives = altResult.alternatives;
  }

  if (!candidateAlternatives || candidateAlternatives.length === 0) {
    return {
      recommendedProduct,
      alternatives: [],
      selectedAlternative: null,
      evaluatedAlternativeCount: 0
    };
  }

  const recFingerprint = recommendedProduct?.fingerprint;

  // Filter out any primary product match if present
  const validAlternatives = candidateAlternatives.filter(
    alt => !recFingerprint || alt.fingerprint !== recFingerprint
  );

  const scoredAlternatives = validAlternatives.map(alt => {
    const rawScore =
      0.40 * alt.similarityScore +
      0.30 * alt.requirementFitScore +
      0.20 * alt.preferenceFitScore +
      0.10 * alt.identityConfidence;
    const alternativeScore = Math.round(rawScore);

    return {
      alt,
      alternativeScore
    };
  });

  // Deterministic sorting
  scoredAlternatives.sort((a, b) => {
    if (b.alternativeScore !== a.alternativeScore) {
      return b.alternativeScore - a.alternativeScore;
    }
    if (b.alt.similarityScore !== a.alt.similarityScore) {
      return b.alt.similarityScore - a.alt.similarityScore;
    }
    if (b.alt.identityConfidence !== a.alt.identityConfidence) {
      return b.alt.identityConfidence - a.alt.identityConfidence;
    }
    return a.alt.fingerprint.localeCompare(b.alt.fingerprint);
  });

  const ranked: RankedAlternativeProduct[] = scoredAlternatives.map((item, index) => ({
    ...item.alt,
    alternativeScore: item.alternativeScore,
    rank: index + 1
  }));

  const selectedAlternative = ranked.length > 0 ? ranked[0] : null;
  const top3Alternatives = ranked.slice(0, 3);

  return {
    recommendedProduct,
    alternatives: top3Alternatives,
    selectedAlternative,
    evaluatedAlternativeCount: candidateAlternatives.length
  };
}
