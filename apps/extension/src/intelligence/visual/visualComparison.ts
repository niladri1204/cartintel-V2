import type { PageProductImage } from "./pageImages";
import type { ProductIntelligence } from "../types";
import type { VisualAttributes } from "./types";
import { normalizeVisualConfidence } from "./types";

export interface VisualComparisonEvidence {
  sourceImage: string | null;
  candidateImage: string | null;
  similarityScore: number | null; // 0 to 100 canonical
  matchingAttributes: string[];
  conflictingAttributes: string[];
  confidence: number | null; // 0 to 100 canonical
  evidence: string[];
  isLookalike?: boolean;
  lookalikeReason?: string | null;
}

function normalizeAttr(val: unknown): string {
  if (!val) return "";
  return String(val).toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Deterministically compares visual features of two products/attribute sets.
 * Produces a canonical 0-100 similarity score, structured evidence, and lookalike classification.
 */
export function compareVisualAttributes(
  source: VisualAttributes | ProductIntelligence | null | undefined,
  candidate: ProductIntelligence | null | undefined,
  options?: {
    sourceImage?: string | null;
    candidateImage?: string | null;
  }
): VisualComparisonEvidence {
  const sourceImage = options?.sourceImage || (source && "originalImage" in source ? (source.originalImage as string) : null) || null;
  const candidateImage = options?.candidateImage || candidate?.originalImage || null;

  const matchingAttributes: string[] = [];
  const conflictingAttributes: string[] = [];
  const evidence: string[] = [];

  if (!source || !candidate) {
    return {
      sourceImage,
      candidateImage,
      similarityScore: null,
      matchingAttributes: [],
      conflictingAttributes: [],
      confidence: null,
      evidence: ["Visual comparison unavailable: missing source or candidate product data."],
      isLookalike: false,
      lookalikeReason: null
    };
  }

  // Extract comparable visual attributes from source
  const sColor = normalizeAttr(source.color);
  const sProductType = normalizeAttr("productType" in source ? source.productType : ("visualCategory" in source ? (source as any).visualCategory : null));
  const sCategory = normalizeAttr(source.category);
  const sFormFactor = normalizeAttr("formFactor" in source ? (source as any).formFactor : null);
  const sMaterial = normalizeAttr("material" in source ? source.material : null);
  const sDesign = normalizeAttr("design" in source ? (source as any).design : null);
  const sBrand = normalizeAttr(source.brand);

  // Extract comparable visual attributes from candidate
  const cColor = normalizeAttr(candidate.color);
  const cProductType = normalizeAttr(candidate.productType);
  const cCategory = normalizeAttr(candidate.category);
  const cFormFactor = normalizeAttr((candidate as any).formFactor || candidate.style || candidate.format);
  const cMaterial = normalizeAttr(candidate.material);
  const cBrand = normalizeAttr(candidate.brand);

  let score = 0;
  let evaluatedDimensions = 0;

  // 1. Product Type / Category Visual Compatibility (Weight: 40)
  if (sProductType && cProductType) {
    evaluatedDimensions++;
    if (sProductType === cProductType || sProductType.includes(cProductType) || cProductType.includes(sProductType)) {
      score += 40;
      matchingAttributes.push("productType");
      evidence.push(`Matching visual product type: '${candidate.productType}'.`);
    } else {
      score -= 30;
      conflictingAttributes.push("productType");
      evidence.push(`Conflicting visual product type: source is '${sProductType}' but candidate is '${cProductType}'.`);
    }
  } else if (sCategory && cCategory) {
    evaluatedDimensions++;
    if (sCategory === cCategory || sCategory.includes(cCategory) || cCategory.includes(sCategory)) {
      score += 25;
      matchingAttributes.push("category");
      evidence.push(`Matching product category: '${candidate.category}'.`);
    } else if (sCategory !== "uncategorized" && cCategory !== "uncategorized") {
      score -= 25;
      conflictingAttributes.push("category");
      evidence.push(`Conflicting category: source is '${sCategory}' but candidate is '${cCategory}'.`);
    }
  }

  // 2. Color Compatibility (Weight: 30)
  if (sColor && cColor) {
    evaluatedDimensions++;
    if (sColor === cColor || sColor.includes(cColor) || cColor.includes(sColor)) {
      score += 30;
      matchingAttributes.push("color");
      evidence.push(`Matching visual color: '${candidate.color}'.`);
    } else {
      score -= 15;
      conflictingAttributes.push("color");
      evidence.push(`Conflicting visual color: source is '${sColor}' but candidate is '${cColor}'.`);
    }
  }

  // 3. Form Factor / Shape Compatibility (Weight: 20)
  if (sFormFactor && cFormFactor) {
    evaluatedDimensions++;
    if (sFormFactor === cFormFactor || sFormFactor.includes(cFormFactor) || cFormFactor.includes(sFormFactor)) {
      score += 20;
      matchingAttributes.push("formFactor");
      evidence.push(`Matching visual form factor: '${(candidate as any).formFactor || candidate.style || candidate.format || cFormFactor}'.`);
    } else {
      score -= 10;
      conflictingAttributes.push("formFactor");
      evidence.push(`Conflicting visual form factor: source is '${sFormFactor}' but candidate is '${cFormFactor}'.`);
    }
  }

  // 4. Material / Design (Weight: 10)
  if (sMaterial && cMaterial) {
    evaluatedDimensions++;
    if (sMaterial === cMaterial || sMaterial.includes(cMaterial) || cMaterial.includes(sMaterial)) {
      score += 10;
      matchingAttributes.push("material");
      evidence.push(`Matching visual material: '${candidate.material}'.`);
    }
  } else if (sDesign) {
    const candTitle = normalizeAttr(candidate.normalizedTitle || candidate.originalTitle);
    if (candTitle.includes(sDesign)) {
      evaluatedDimensions++;
      score += 10;
      matchingAttributes.push("design");
      evidence.push(`Matching visual design element: '${sDesign}'.`);
    }
  }

  if (evaluatedDimensions === 0) {
    return {
      sourceImage,
      candidateImage,
      similarityScore: null,
      matchingAttributes: [],
      conflictingAttributes: [],
      confidence: null,
      evidence: ["Visual comparison provider is unavailable: insufficient visual attributes to compare."],
      isLookalike: false,
      lookalikeReason: null
    };
  }

  const finalSimilarityScore = Math.max(0, Math.min(100, score));
  const confidence = evaluatedDimensions >= 2 ? 90 : evaluatedDimensions === 1 ? 75 : 60;

  // Lookalike Classification:
  // When brands differ (e.g. Nike vs Puma, or brand A vs brand B) but visual similarity is high (>= 60)
  // and there is no product type conflict, classify as LOOKALIKE.
  let isLookalike = false;
  let lookalikeReason: string | null = null;

  const brandsDiffer = Boolean(sBrand && cBrand && sBrand !== cBrand);
  const noProductTypeConflict = !conflictingAttributes.includes("productType") && !conflictingAttributes.includes("category");

  if (brandsDiffer && finalSimilarityScore >= 60 && noProductTypeConflict) {
    isLookalike = true;
    lookalikeReason = `Visually similar alternative from ${candidate.brand || "alternative brand"} with matching ${matchingAttributes.join(", ")}.`;
    evidence.push(lookalikeReason);
  }

  return {
    sourceImage,
    candidateImage,
    similarityScore: finalSimilarityScore,
    matchingAttributes,
    conflictingAttributes,
    confidence: normalizeVisualConfidence(confidence),
    evidence,
    isLookalike,
    lookalikeReason
  };
}

/**
 * Creates a structured representation for comparing the webpage product image with discovered candidate products.
 */
export function prepareVisualComparison(
  pageImage: PageProductImage | null,
  candidate: ProductIntelligence
): VisualComparisonEvidence {
  const sourceImage = pageImage?.url || null;
  const candidateImage = candidate?.originalImage || null;

  if (!pageImage && !candidate) {
    return {
      sourceImage: null,
      candidateImage: null,
      similarityScore: null,
      matchingAttributes: [],
      conflictingAttributes: [],
      confidence: null,
      evidence: ["Visual comparison provider is unavailable or not configured. Cannot perform visual analysis."]
    };
  }

  // Build synthetic visual attributes from page image metadata if present
  const sourceAttrs: VisualAttributes = {
    color: null,
    visualCategory: null
  };

  if (pageImage) {
    const pageAltLower = (pageImage.alt || "").toLowerCase();
    const commonColors = ["black", "white", "blue", "red", "green", "pink", "purple", "silver", "gold", "gray", "grey", "brown", "beige", "titanium black", "obsidian", "hazel", "porcelain"];
    for (const c of commonColors) {
      if (pageAltLower.includes(c)) {
        sourceAttrs.color = c;
        break;
      }
    }
  }

  const comparison = compareVisualAttributes(sourceAttrs, candidate, {
    sourceImage,
    candidateImage
  });

  return comparison;
}
