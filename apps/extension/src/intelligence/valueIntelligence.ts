import type { RecommendationRequest, RecommendationCandidate } from "../recommendationTypes";
import { evaluateElectronicsRequirements } from "./electronicsRequirement";
import { compareSpecValue } from "./specComparison";

export type ElectronicsValueRating = "strong_value" | "reasonable_value" | "weak_value" | "insufficient_evidence";

export interface ElectronicsValueAssessment {
  rating: ElectronicsValueRating;
  explanation: string;
  priceScore: number;
  requirementFitScore: number;
  specAdvantageScore: number;
  overallValueScore: number;
}

function getLocalNumericPrice(candidate: RecommendationCandidate): number | null {
  const p = candidate.product?.originalPrice;
  if (p == null) return null;
  if (typeof p === "number") return isNaN(p) || p <= 0 ? null : p;
  if (typeof p === "string") {
    const parsed = parseFloat((p as string).replace(/[^0-9.]/g, ""));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  }
  return null;
}

export function evaluateElectronicsOfferValue(
  candidate: RecommendationCandidate,
  request: RecommendationRequest,
  eligibleOffers: RecommendationCandidate[],
  baseValueScore: number,
  priceScore: number
): ElectronicsValueAssessment {
  const prod = candidate.product;
  if (!prod) {
    return {
      rating: "insufficient_evidence",
      explanation: "Insufficient evidence due to missing product data.",
      priceScore: 0,
      requirementFitScore: 0,
      specAdvantageScore: 0,
      overallValueScore: 0
    };
  }

  // 1. Missing Data Check
  const price = getLocalNumericPrice(candidate);
  const currency = prod.originalCurrency;
  if (price == null || !currency) {
    return {
      rating: "insufficient_evidence",
      explanation: "Insufficient evidence to determine value due to missing price.",
      priceScore: 0,
      requirementFitScore: 0,
      specAdvantageScore: 0,
      overallValueScore: 0
    };
  }

  // 2. Requirement Fit Check (Phase 2.5)
  const reqs = request.explicitRequirements || [];
  let requirementFitScore = 100;
  let hasMandatoryViolation = false;

  if (reqs.length > 0) {
    const fitResult = evaluateElectronicsRequirements(prod, reqs);
    const total = reqs.length;
    const satisfied = fitResult.satisfiedCount;
    requirementFitScore = Math.round((satisfied / total) * 100);

    // If any mandatory requirement is not satisfied, it is a hard violation
    hasMandatoryViolation = fitResult.fits.some(
      f => f.requirement.isMandatory === true && f.status === "not_satisfied"
    );
  }

  // 3. Hard constraints check (Phase 1)
  const hardConstraints = request.hardConstraints || [];
  const hasHardViolation = hardConstraints.some(hc => {
    // If any eligible condition/brand constraint is violated
    const normAttr = hc.attribute.toLowerCase().trim();
    if (normAttr === "condition") {
      const isRefurbished = Boolean(candidate.isRefurbishedOrUsed);
      const targetCond = String(hc.value).toLowerCase().trim();
      if (targetCond === "new" && isRefurbished) return true;
      if ((targetCond === "refurbished" || targetCond === "used") && !isRefurbished) return true;
    }
    return false;
  });

  if (hasMandatoryViolation || hasHardViolation) {
    return {
      rating: "weak_value",
      explanation: "Weak value because this offer violates a mandatory user requirement.",
      priceScore,
      requirementFitScore: 0,
      specAdvantageScore: 0,
      overallValueScore: 0
    };
  }

  // 4. Specification Advantage Score (Phase 2.3)
  let specAdvantageScore = 0;
  let advantageCount = 0;
  let disadvantageCount = 0;

  // Determine reference product: either request context currentProduct, or cheapest eligible offer
  let referenceProd = request.productContext?.currentProduct || null;
  if (!referenceProd && eligibleOffers.length > 0) {
    // Find cheapest offer with same currency
    const sameCurrency = eligibleOffers.filter(
      o => o.product?.originalCurrency?.toUpperCase().trim() === currency.toUpperCase().trim()
    );
    if (sameCurrency.length > 0) {
      const sorted = [...sameCurrency].sort((a, b) => (getLocalNumericPrice(a) || Infinity) - (getLocalNumericPrice(b) || Infinity));
      referenceProd = sorted[0].product || null;
    }
  }

  // If comparing to a reference product, check the compatible currency
  if (referenceProd && referenceProd.originalCurrency?.toUpperCase().trim() !== currency.toUpperCase().trim()) {
    // Mixed currency warning
    return {
      rating: "insufficient_evidence",
      explanation: "Insufficient evidence to compare value due to currency mismatch.",
      priceScore: 0,
      requirementFitScore,
      specAdvantageScore: 0,
      overallValueScore: 0
    };
  }

  if (referenceProd && referenceProd !== prod) {
    const specKeys = [
      "ram",
      "storage",
      "displaySize",
      "resolution",
      "refreshRate",
      "chargingCapability",
      "batteryCapacity"
    ];

    for (const key of specKeys) {
      const cmp = compareSpecValue(key, (prod as any)[key], (referenceProd as any)[key]);
      if (cmp === "higher") {
        advantageCount++;
      } else if (cmp === "lower") {
        disadvantageCount++;
      }
    }
    specAdvantageScore = advantageCount - disadvantageCount;
  }

  // 5. Calculate Overall Value Score
  let overallValueScore = baseValueScore;

  if (requirementFitScore < 100) {
    const penalty = (100 - requirementFitScore) * 0.5;
    overallValueScore -= penalty;
  }

  if (specAdvantageScore > 0) {
    const boost = specAdvantageScore * 5;
    overallValueScore += boost;
  } else if (specAdvantageScore < 0) {
    const penalty = Math.abs(specAdvantageScore) * 5;
    overallValueScore -= penalty;
  }

  overallValueScore = Math.max(0, Math.min(100, overallValueScore));

  // 6. Value Assessment
  let rating: ElectronicsValueRating = "reasonable_value";
  let explanation = "Reasonable value with a balanced mix of price, quality, and requirement fit.";

  if (overallValueScore >= 85) {
    rating = "strong_value";
    explanation = "Strong value because this offer satisfies the user requirements and offers superior specifications for its price.";
  } else if (overallValueScore <= 45) {
    rating = "weak_value";
    explanation = "Weak value because the spec compromises do not justify the price relative to other options.";
  }

  return {
    rating,
    explanation,
    priceScore,
    requirementFitScore,
    specAdvantageScore,
    overallValueScore
  };
}
