import type { RecommendationRequest } from "../recommendationTypes";
import type { ProductDecisionGroup, AlternativeProduct, AlternativeProductResult } from "./decisionTypes";
import { evaluateProductLevelDecisions } from "./productDecision";
import { inferDomain, areDomainsCompatible } from "../domain";
import { areModelsMatching } from "../matching";

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
  const evaluatedDecision = evaluateProductLevelDecisions(request, request?.candidates || undefined);
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
  const recDomain = recommendedProduct.product.domain || inferDomain(recommendedProduct.product.category, recommendedProduct.product.normalizedTitle);
  const recProductType = (recommendedProduct.product.productType || "").toLowerCase().trim();

  const candidatesToEvaluate = allGroups.filter(g => {
    if (g.fingerprint === recFingerprint || g.isEligible !== true) return false;

    // Domain Boundary Isolation
    const groupDomain = g.product.domain || inferDomain(g.product.category, g.product.normalizedTitle);
    if (!areDomainsCompatible(recDomain, groupDomain)) return false;

    // Product Type Separation within Domain
    const groupProductType = (g.product.productType || "").toLowerCase().trim();
    if (recProductType && groupProductType && recProductType !== "uncategorized" && groupProductType !== "uncategorized") {
      if (
        (recProductType === "smartphone" && groupProductType === "smartwatch") ||
        (recProductType === "smartwatch" && groupProductType === "smartphone") ||
        (recProductType === "smartphone" && groupProductType === "television") ||
        (recProductType === "laptop" && groupProductType === "shoes")
      ) {
        return false;
      }
    }
    // Same model line filter (e.g. S24 256GB vs S24 512GB, Atomic Habits Paperback vs Hardcover)
    const sameBrand =
      (!recommendedProduct.product.brand && !g.product.brand) ||
      (Boolean(recommendedProduct.product.brand) &&
        Boolean(g.product.brand) &&
        recommendedProduct.product.brand!.toLowerCase() === g.product.brand!.toLowerCase());

    if (
      sameBrand &&
      recommendedProduct.product.model &&
      g.product.model &&
      areModelsMatching(recommendedProduct.product.model, g.product.model, recommendedProduct.product.brand || g.product.brand)
    ) {
      return false;
    }

    return true;
  });

  const alternatives: AlternativeProduct[] = [];

  const recStyle = (recommendedProduct.product.style || "").toLowerCase().trim();

  for (const group of candidatesToEvaluate) {
    const groupCategory = group.product.category?.toLowerCase().trim();
    const isSameCategory = recCategory && groupCategory ? recCategory === groupCategory : true;
    const categoryScoreComponent = isSameCategory ? 100 : 40;

    const reqFit = group.requirementFitScore ?? 100;
    const prefFit = group.preferenceFitScore ?? 100;
    const identConf = group.bestIdentityConfidence ?? 90;

    // Footwear style preference bonus (prefer running to running, formal to formal)
    const groupStyle = (group.product.style || "").toLowerCase().trim();
    const styleBonus = (recStyle && groupStyle && recStyle === groupStyle) ? 15 : 0;

    const rawScore = 0.40 * reqFit + 0.30 * prefFit + 0.20 * identConf + 0.10 * categoryScoreComponent + styleBonus;
    const similarityScore = Math.min(100, Math.round(rawScore));

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

  // Deterministic sorting: similarityScore descending, identityConfidence descending, fingerprint ascending as tie-breaker
  alternatives.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    if (b.identityConfidence !== a.identityConfidence) {
      return b.identityConfidence - a.identityConfidence;
    }
    return a.fingerprint.localeCompare(b.fingerprint);
  });

  return {
    recommendedProduct,
    alternatives,
    evaluatedProductCount: allGroups.length
  };
}
