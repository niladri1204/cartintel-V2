import type { VisualProductRecognitionResult, VisualAttributes } from "./types";
import type { SearchQueryInput } from "../../services/search/queryGenerator";

export interface VisualSearchAttributes {
  category: string | null;
  brand: string | null;
  model: string | null;
  productType: string | null;
  color: string | null;
  design: string | null;
  shape: string | null;
  material: string | null;
  formFactor: string | null;
  visibleSpecifications: string[] | null;
  variantIndicators: string[] | null;
  accessories: string[] | null;
  searchTerms: string[];
  confidence: number | null;
  evidence: Array<{ source: string; description: string; confidence?: number }>;
}

function normalizeString(val: string | null | undefined): string | null {
  if (!val) return null;
  return val.trim().replace(/\s+/g, " ");
}

export function normalizeVisualAttributes(attributes: VisualAttributes): VisualAttributes {
  const result: VisualAttributes = {};
  for (const [key, val] of Object.entries(attributes)) {
    if (typeof val === "string") {
      result[key] = normalizeString(val);
    } else if (Array.isArray(val)) {
      result[key] = val
        .map((item) => (typeof item === "string" ? normalizeString(item) : item))
        .filter(Boolean);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export function convertToSearchAttributes(
  visualResult: VisualProductRecognitionResult,
  inputMetadata?: { type?: string; [key: string]: any }
): VisualSearchAttributes {
  // Enforce input immutability by deep copying the visualResult input parameters
  const resultCopy = JSON.parse(JSON.stringify(visualResult)) as VisualProductRecognitionResult;

  const isLowConfidence = typeof resultCopy.confidence === "number" && resultCopy.confidence < 0.6;
  const isUnknown = resultCopy.status === "unknown" || resultCopy.status === "unavailable";

  // Safely nullify attributes on low-confidence or unknown outputs to prevent bad query generation
  const category = !isUnknown ? normalizeString(resultCopy.category) : null;
  const brand = !isUnknown && !isLowConfidence ? normalizeString(resultCopy.brand) : null;
  const model = !isUnknown && !isLowConfidence ? normalizeString(resultCopy.model) : null;
  const productType = !isUnknown ? normalizeString(resultCopy.productType) : null;

  const rawAttributes = resultCopy.visualAttributes || {};
  const normalizedAttrs = !isUnknown && !isLowConfidence ? normalizeVisualAttributes(rawAttributes) : {};

  // Extract visible specifications (e.g. "4K", "144Hz", "16GB") backed by visual evidence
  const visibleSpecifications: string[] = [];
  if (Array.isArray(rawAttributes.visibleSpecifications)) {
    rawAttributes.visibleSpecifications.forEach((spec: any) => {
      const normalizedSpec = normalizeString(String(spec));
      if (normalizedSpec) visibleSpecifications.push(normalizedSpec);
    });
  }

  // Scan evidence for visible specification patterns (e.g. 16GB, 4K, 144Hz, 27 inch)
  const specPatterns = [
    /\b\d+\s*(?:gb|mb|tb|ram|ssd|hdd|k|hz|g)\b/i,
    /\b\d+\s*(?:inch|inches)\b/i
  ];
  
  if (Array.isArray(resultCopy.evidence)) {
    resultCopy.evidence.forEach((ev) => {
      // Check if evidence matches common specification pattern
      specPatterns.forEach((pattern) => {
        const matches = ev.description.match(pattern);
        if (matches) {
          matches.forEach((match) => {
            const normalizedMatch = normalizeString(match);
            if (normalizedMatch && !visibleSpecifications.includes(normalizedMatch)) {
              // Ensure we only include it if it's high confidence evidence or not low-confidence
              if (ev.confidence === undefined || ev.confidence >= 0.7) {
                visibleSpecifications.push(normalizedMatch);
              }
            }
          });
        }
      });
    });
  }

  // Handle visible accessories with conservative filtering on page screenshots to avoid UI pollution
  let accessories: string[] = [];
  if (Array.isArray(rawAttributes.accessories)) {
    rawAttributes.accessories.forEach((acc: any) => {
      const normalizedAcc = normalizeString(String(acc));
      if (normalizedAcc) accessories.push(normalizedAcc);
    });
  }

  if (inputMetadata?.type === "shopping_page_screenshot" && accessories.length > 0) {
    // Under shopping page screenshot, filter accessories conservative to only include them
    // if there is explicit high-confidence OCR or text evidence backing them.
    accessories = accessories.filter((acc) => {
      return resultCopy.evidence.some(
        (ev) =>
          (ev.source === "ocr" || ev.source === "text" || ev.source === "logo") &&
          ev.description.toLowerCase().includes(acc.toLowerCase()) &&
          (ev.confidence === undefined || ev.confidence >= 0.7)
      );
    });
  }

  // Variant indicators (color, form-factor, model suffixes, etc.)
  const variantIndicators: string[] = [];
  if (normalizedAttrs.color) variantIndicators.push(normalizedAttrs.color);
  if (normalizedAttrs.formFactor) variantIndicators.push(normalizedAttrs.formFactor);
  if (rawAttributes.variantIndicators && Array.isArray(rawAttributes.variantIndicators)) {
    rawAttributes.variantIndicators.forEach((indicator: any) => {
      const normalizedInd = normalizeString(String(indicator));
      if (normalizedInd && !variantIndicators.includes(normalizedInd)) {
        variantIndicators.push(normalizedInd);
      }
    });
  }

  // Construct initial query search terms
  const searchTerms: string[] = [];
  
  // High confidence items only in query terms
  if (brand) searchTerms.push(brand);
  if (model) searchTerms.push(model);
  if (normalizedAttrs.color && !isLowConfidence) searchTerms.push(normalizedAttrs.color);
  if (!model && productType) searchTerms.push(productType); // Fallback to productType if model is unknown
  
  visibleSpecifications.forEach((spec) => {
    if (!searchTerms.includes(spec)) searchTerms.push(spec);
  });

  return {
    category,
    brand,
    model,
    productType,
    color: normalizedAttrs.color || null,
    design: normalizedAttrs.design || null,
    shape: normalizedAttrs.shape || null,
    material: normalizedAttrs.material || null,
    formFactor: normalizedAttrs.formFactor || null,
    visibleSpecifications: visibleSpecifications.length > 0 ? visibleSpecifications : null,
    variantIndicators: variantIndicators.length > 0 ? variantIndicators : null,
    accessories: accessories.length > 0 ? accessories : null,
    searchTerms,
    confidence: typeof resultCopy.confidence === "number" ? resultCopy.confidence : null,
    evidence: Array.isArray(resultCopy.evidence) ? resultCopy.evidence.map((e) => ({ ...e })) : [],
  };
}

export function generateSearchQuery(searchAttributes: VisualSearchAttributes): string {
  // If searchTerms is empty, we return an empty string
  if (!searchAttributes.searchTerms || searchAttributes.searchTerms.length === 0) {
    // Try building a fallback query from category/color
    const parts: string[] = [];
    if (searchAttributes.color) parts.push(searchAttributes.color);
    if (searchAttributes.productType) parts.push(searchAttributes.productType);
    else if (searchAttributes.category) parts.push(searchAttributes.category);

    return parts.join(" ").trim();
  }

  // Format terms into a query string deterministically
  return searchAttributes.searchTerms.join(" ").trim();
}

export function enhanceSearchQueryInput(
  visual: VisualSearchAttributes,
  existingInput?: SearchQueryInput
): SearchQueryInput {
  // Maintain immutability: create a shallow/deep copy of existingInput
  const baseInput: SearchQueryInput = existingInput
    ? JSON.parse(JSON.stringify(existingInput))
    : { title: "", attributes: {} };

  // Set the search query title if existing title is empty
  const generatedQuery = generateSearchQuery(visual);
  if (!baseInput.title && generatedQuery) {
    baseInput.title = generatedQuery;
  }

  // Enhance brand, model, and category fields if they are not already set
  if (!baseInput.brand && visual.brand) {
    baseInput.brand = visual.brand;
  }
  if (!baseInput.model && visual.model) {
    baseInput.model = visual.model;
  }
  if (!baseInput.category && visual.category) {
    baseInput.category = visual.category;
  }

  // Ensure attributes dictionary is defined
  if (!baseInput.attributes) {
    baseInput.attributes = {};
  }

  // Merge visual attributes into query input attributes safely
  if (visual.color && baseInput.attributes.color === undefined) {
    baseInput.attributes.color = visual.color;
  }
  if (visual.formFactor && baseInput.attributes.formFactor === undefined) {
    baseInput.attributes.formFactor = visual.formFactor;
  }
  if (visual.material && baseInput.attributes.material === undefined) {
    baseInput.attributes.material = visual.material;
  }

  return baseInput;
}
