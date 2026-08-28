import type { VisualProductRecognitionResult } from "./types";
import { normalizeVisualConfidence } from "./types";

export type VisualIdentityStatus =
  | "consistent"
  | "conflicting"
  | "supporting"
  | "insufficient_evidence";

export interface VisualIdentityReconciliation {
  status: VisualIdentityStatus;
  resolvedBrand: string | null;
  resolvedModel: string | null;
  resolvedCategory: string | null;
  visualBrand: string | null;
  visualModel: string | null;
  conflicts: string[];
  supportingEvidence: string[];
  confidence: number | null;
}

/**
 * Normalizes common separators, whitespaces, casings, and punctuation
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ")    // Collapse whitespace
    .trim();
}

/**
 * Compares two models after normalization and stripping known brand names
 */
export function normalizeAndCompareModels(
  modelA: string | null | undefined,
  modelB: string | null | undefined,
  brandA: string | null | undefined,
  brandB: string | null | undefined
): boolean {
  if (!modelA || !modelB) return false;

  const brands = [brandA, brandB].filter(Boolean) as string[];

  let cleanA = normalizeString(modelA);
  let cleanB = normalizeString(modelB);

  // Strip brand prefixes if they are present in the models
  for (const b of brands) {
    const nb = normalizeString(b);
    if (nb) {
      if (cleanA.startsWith(nb)) {
        cleanA = cleanA.substring(nb.length).trim();
      }
      if (cleanB.startsWith(nb)) {
        cleanB = cleanB.substring(nb.length).trim();
      }
      if (cleanA.endsWith(nb)) {
        cleanA = cleanA.substring(0, cleanA.length - nb.length).trim();
      }
      if (cleanB.endsWith(nb)) {
        cleanB = cleanB.substring(0, cleanB.length - nb.length).trim();
      }
    }
  }

  return cleanA === cleanB;
}

/**
 * Reconciles visual product recognition results with page/structured identity.
 * Enforces page identity authority in case of conflicts.
 */
export function reconcileVisualIdentity(
  visualResult: VisualProductRecognitionResult,
  pageIdentity: {
    title?: string | null;
    brand?: string | null;
    model?: string | null;
    productType?: string | null;
    category?: string | null;
  }
): VisualIdentityReconciliation {
  const conflicts: string[] = [];
  const supportingEvidence: string[] = [];

  const visualBrand = visualResult.brand || null;
  const visualModel = visualResult.model || null;
  const visualCategory = visualResult.category || null;

  const pageBrand = pageIdentity.brand || null;
  const pageModel = pageIdentity.model || null;
  const pageCategory = pageIdentity.category || null;

  let resolvedBrand = pageBrand;
  let resolvedModel = pageModel;
  let resolvedCategory = pageCategory;

  let brandConflict = false;
  let modelConflict = false;

  // 1. Brand Reconciliation
  if (pageBrand && visualBrand) {
    const normPageBrand = normalizeString(pageBrand);
    const normVisualBrand = normalizeString(visualBrand);
    if (normPageBrand !== normVisualBrand) {
      brandConflict = true;
      conflicts.push(`Visual brand ${visualBrand} conflicts with page brand ${pageBrand}.`);
    } else {
      supportingEvidence.push("Visual brand matches page brand.");
    }
  } else if (!pageBrand && visualBrand) {
    resolvedBrand = visualBrand;
    supportingEvidence.push(`Visual brand ${visualBrand} provides brand evidence.`);
  }

  // 2. Model Reconciliation
  if (pageModel && visualModel) {
    const compatible = normalizeAndCompareModels(
      pageModel,
      visualModel,
      pageBrand || resolvedBrand,
      visualBrand
    );
    if (!compatible) {
      modelConflict = true;
      conflicts.push(`Visual model ${visualModel} conflicts with page model ${pageModel}.`);
    } else {
      supportingEvidence.push("Visual model is consistent with page model.");
    }
  } else if (!pageModel && visualModel) {
    resolvedModel = visualModel;
    supportingEvidence.push(`Visual model ${visualModel} provides model evidence.`);
  }

  // 3. Category Reconciliation
  if ((!pageCategory || /^(uncategorized|unknown)$/i.test(pageCategory)) && visualCategory) {
    resolvedCategory = visualCategory;
  }

  // 4. Resolve Status
  let status: VisualIdentityStatus = "insufficient_evidence";

  if (brandConflict || modelConflict) {
    status = "conflicting";
    // Overwrite resolved values to page values to enforce page authority
    resolvedBrand = pageBrand;
    resolvedModel = pageModel;
  } else {
    const pageBrandPresent = Boolean(pageBrand);
    const pageModelPresent = Boolean(pageModel);
    const visualBrandPresent = Boolean(visualBrand);
    const visualModelPresent = Boolean(visualModel);

    const brandMatches = pageBrandPresent && visualBrandPresent && normalizeString(pageBrand) === normalizeString(visualBrand);
    const modelMatches = pageModelPresent && visualModelPresent && normalizeAndCompareModels(pageModel, visualModel, pageBrand || resolvedBrand, visualBrand);

    const hasNewInfo = (!pageBrandPresent && visualBrandPresent) || (!pageModelPresent && visualModelPresent);

    if (hasNewInfo) {
      status = "supporting";
    } else {
      const brandAgrees = !visualBrandPresent || brandMatches;
      const modelAgrees = !visualModelPresent || modelMatches;

      if (brandAgrees && modelAgrees && (visualBrandPresent || visualModelPresent)) {
        status = "consistent";
      }
    }
  }

  return {
    status,
    resolvedBrand,
    resolvedModel,
    resolvedCategory,
    visualBrand,
    visualModel,
    conflicts,
    supportingEvidence,
    confidence: normalizeVisualConfidence(visualResult.confidence)
  };
}
