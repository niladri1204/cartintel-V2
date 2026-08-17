import type { RecommendationRequest } from "../recommendationTypes";
import type { ProductDecisionGroup, AlternativeProduct, AlternativeProductResult } from "./decisionTypes";
import { evaluateProductLevelDecisions } from "./productDecision";

/**
 * Identifies genuine alternative canonical products when the selected product is unavailable,
 * unsuitable, or when useful alternatives should be shown.
 *
 * Alternatives remain separate from:
 * - the exact recommended product;
 * - different seller offers of the same canonical product (same fingerprint);
 * - incompatible variants of the same product line (same fingerprint);
 * - products violating hard constraints.
 *
 * @param request The RecommendationRequest.
 * @param productGroups Optional explicit list of evaluated ProductDecisionGroup items.
 * @returns AlternativeProductResult contract.
 */
export function identifyAlternativeProducts(
  request: RecommendationRequest | null | undefined,
  productGroups?: ProductDecisionGroup[]
): AlternativeProductResult {
  const evaluatedDecision = evaluateProductLevelDecisions(request, request?.candidates);
  const recommendedProduct = evaluatedDecision.bestProductGroup;
  const allGroups = productGroups || evaluatedDecision.productGroups;

  if (!recommendedProduct || allGroups.length === 0) {
    return {
      recommendedProduct: null,
      alternatives: [],
      evaluatedProductCount: allGroups.length
    };
  }

  const recFingerprint = recommendedProduct.fingerprint;
  const recCategory = recommendedProduct.product.category?.toLowerCase().trim();

  const candidatesToEvaluate = allGroups.filter(
    g => g.fingerprint !== recFingerprint && g.isEligible === true
  );

  const alternatives: AlternativeProduct[] = [];

  for (const group of candidatesToEvaluate) {
    const groupCategory = group.product.category?.toLowerCase().trim();
    const isSameCategory = recCategory && groupCategory ? recCategory === groupCategory : true;
    const categoryScoreComponent = isSameCategory ? 100 : 40;

    const reqFit = group.requirementFitScore;
    const prefFit = group.preferenceFitScore;
    const identConf = group.bestIdentityConfidence;

    const rawScore = 0.40 * reqFit + 0.30 * prefFit + 0.20 * identConf + 0.10 * categoryScoreComponent;
    const similarityScore = Math.round(rawScore);

    const brandStr = group.product.brand ? group.product.brand.toUpperCase() : "Alternative";
    const titleStr = group.product.model || group.product.originalTitle || "Product";
    const reason = `Alternative ${brandStr} product (${titleStr}) with ${reqFit}% requirement fit and ${identConf}% identity confidence`;

    alternatives.push({
      product: group.product,
      fingerprint: group.fingerprint,
      similarityScore,
      requirementFitScore: reqFit,
      preferenceFitScore: prefFit,
      identityConfidence: identConf,
      reason
    });
  }

  // Deterministic sorting: similarityScore descending, fingerprint ascending as tie-breaker
  alternatives.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    return a.fingerprint.localeCompare(b.fingerprint);
  });

  return {
    recommendedProduct,
    alternatives,
    evaluatedProductCount: allGroups.length
  };
}
