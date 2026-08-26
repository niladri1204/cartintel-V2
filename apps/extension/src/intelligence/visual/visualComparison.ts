import type { PageProductImage } from "./pageImages";
import type { ProductIntelligence } from "../types";

export interface VisualComparisonEvidence {
  sourceImage: string | null;
  candidateImage: string | null;
  similarityScore: number | null;
  matchingAttributes: string[];
  conflictingAttributes: string[];
  confidence: number | null;
  evidence: string[];
}

/**
 * Creates a structured representation for comparing the webpage product image with discovered candidate products.
 * Safely analyzes metadata attributes if available, leaving similarityScore null to avoid fabrication.
 */
export function prepareVisualComparison(
  pageImage: PageProductImage | null,
  candidate: ProductIntelligence
): VisualComparisonEvidence {
  const sourceImage = pageImage?.url || null;
  const candidateImage = candidate.originalImage || null;
  const similarityScore: number | null = null;

  const matchingAttributes: string[] = [];
  const conflictingAttributes: string[] = [];
  const evidence: string[] = [];

  if (pageImage && pageImage.relevanceScore >= 35 && candidate.brand) {
    const pageAltLower = (pageImage.alt || "").toLowerCase();
    const candidateBrandLower = candidate.brand.toLowerCase();

    // Brand check
    if (pageAltLower.includes(candidateBrandLower)) {
      matchingAttributes.push("brand");
      evidence.push(`Brand '${candidate.brand}' matches alt text description of the page image.`);
    } else if (pageAltLower.length > 0) {
      const potentialBrands = ["apple", "samsung", "google", "oneplus", "xiaomi", "sony", "dell", "hp", "lenovo", "asus"];
      const pageBrands = potentialBrands.filter((b) => pageAltLower.includes(b));
      if (pageBrands.length > 0 && !pageBrands.includes(candidateBrandLower)) {
        conflictingAttributes.push("brand");
        evidence.push(
          `Potential brand conflict: Page image suggests '${pageBrands.join(", ")}' but candidate is '${candidate.brand}'.`
        );
      }
    }

    // Color check
    if (candidate.color) {
      const colorLower = candidate.color.toLowerCase();
      if (pageAltLower.includes(colorLower)) {
        matchingAttributes.push("color");
        evidence.push(`Color '${candidate.color}' matches visual alt description.`);
      }
    }
  }

  if (evidence.length === 0 || similarityScore === null) {
    evidence.unshift(
      "Visual comparison provider is unavailable or not configured. Cannot perform visual analysis."
    );
  }

  return {
    sourceImage,
    candidateImage,
    similarityScore: null,
    matchingAttributes,
    conflictingAttributes,
    confidence: null,
    evidence
  };
}
