import type { ProductIntelligence } from "./types";
import { cleanSpecForComparison } from "./variant";

export interface MatchResult {
  score: number;
  confidence: number;
  decision: string;
  isMatch: boolean;
  matchedFields: string[];
  mismatchedFields: string[];
  similarityType: string;
}

function isComparable(val1: any, val2: any): boolean {
  return val1 !== null && val1 !== undefined && val2 !== null && val2 !== undefined;
}

/**
 * Normalizes model strings for comparison, stripping parentheses and extra whitespace.
 * e.g., "phone (3)" -> "phone 3", "phone (2a)" -> "phone 2a"
 */
function normalizeModelForMatching(str: string | null | undefined): string | null {
  if (!str) return null;
  return str
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareProducts(
  left: ProductIntelligence,
  right: ProductIntelligence
): MatchResult {
  let score = 0;
  const matchedFields: string[] = [];
  const mismatchedFields: string[] = [];

  // 1. Core Identity: Brand Check
  if (isComparable(left.brand, right.brand)) {
    if (left.brand!.trim().toLowerCase() === right.brand!.trim().toLowerCase()) {
      matchedFields.push("brand");
    } else {
      mismatchedFields.push("brand");
      return {
        score: 0,
        confidence: 0,
        decision: "No Match",
        isMatch: false,
        matchedFields,
        mismatchedFields,
        similarityType: "Different Product"
      };
    }
  }

  // 2. Core Identity: Model Check
  const normLeftModel = normalizeModelForMatching(left.model);
  const normRightModel = normalizeModelForMatching(right.model);

  if (normLeftModel && normRightModel) {
    if (normLeftModel === normRightModel) {
      score += 80; // Core model identity match gives strong base score
      matchedFields.push("model");
    } else {
      mismatchedFields.push("model");
      return {
        score: 0,
        confidence: 0,
        decision: "No Match",
        isMatch: false,
        matchedFields,
        mismatchedFields,
        similarityType: "Different Product"
      };
    }
  } else if (!normLeftModel && !normRightModel) {
    // Neither has explicit model, rely on brand + title match
    score += 40;
  } else {
    // One has model and other doesn't, partial match
    score += 30;
  }

  // 2.5 Core Identity: Category & ProductType Check
  if (isComparable(left.productType, right.productType)) {
    const pt1 = left.productType!.trim().toLowerCase();
    const pt2 = right.productType!.trim().toLowerCase();
    if (pt1 && pt2) {
      if (pt1 === pt2) {
        matchedFields.push("productType");
      } else {
        mismatchedFields.push("productType");
      }
    }
  }

  if (isComparable(left.category, right.category)) {
    const cat1 = left.category!.trim().toLowerCase();
    const cat2 = right.category!.trim().toLowerCase();
    if (cat1 && cat2 && cat1 !== "uncategorized" && cat2 !== "uncategorized") {
      if (cat1 === cat2) {
        matchedFields.push("category");
      } else {
        mismatchedFields.push("category");
      }
    }
  }

  // 2.6 Core Identity: Accessory & Bundle Check
  const getProductTitleText = (p: ProductIntelligence): string => {
    return [p.originalTitle, p.normalizedTitle].filter(Boolean).join(" ");
  };

  const ACCESSORY_REGEX =
    /\b(?:case|cover|screen\s*protector|tempered\s*glass|protective\s*glass|screen\s*guard|phone\s*cover|mobile\s*cover|back\s*cover|bumper\s*case|charger|charging\s*cable|charging\s*adapter|adapter|cable|replacement\s*battery|battery\s*replacement|replacement\s*screen|replacement\s*display|lens\s*protector|camera\s*protector|keyboard\s*cover|laptop\s*sleeve)\b/i;

  const BUNDLE_REGEX =
    /\b(?:combo|bundle|kit|pack\s+with|with\s+case|with\s+charger|with\s+cover|with\s+screen\s+protector)\b|\+\s*(?:case|charger|cover|screen\s*protector)\b/i;

  const leftIsAccessory = ACCESSORY_REGEX.test(getProductTitleText(left));
  const rightIsAccessory = ACCESSORY_REGEX.test(getProductTitleText(right));

  if (leftIsAccessory !== rightIsAccessory) {
    mismatchedFields.push("accessory");
  }

  const leftIsBundle = BUNDLE_REGEX.test(getProductTitleText(left));
  const rightIsBundle = BUNDLE_REGEX.test(getProductTitleText(right));

  if (leftIsBundle !== rightIsBundle) {
    mismatchedFields.push("bundle");
  }

  // 3. Variant Attributes: Storage, RAM, Color, Variant
  const compareVariantField = (name: string, val1: any, val2: any, fieldScore: number) => {
    if (isComparable(val1, val2)) {
      const str1 = String(val1).trim().toLowerCase();
      const str2 = String(val2).trim().toLowerCase();
      if (str1 && str2) {
        if (str1 === str2) {
          score += fieldScore;
          matchedFields.push(name);
        } else {
          mismatchedFields.push(name);
        }
      }
    }
  };

  compareVariantField("storage", left.storage, right.storage, 10);
  compareVariantField("ram", left.ram, right.ram, 5);
  compareVariantField("color", left.color, right.color, 5);
  compareVariantField("variant", left.variant, right.variant, 5);

  const compareDeepVariantField = (name: string, val1: any, val2: any) => {
    if (isComparable(val1, val2)) {
      const c1 = cleanSpecForComparison(name, String(val1));
      const c2 = cleanSpecForComparison(name, String(val2));
      if (c1 && c2) {
        if (c1 === c2) {
          matchedFields.push(name);
        } else {
          mismatchedFields.push(name);
        }
      }
    }
  };

  compareDeepVariantField("processor", left.processor, right.processor);
  compareDeepVariantField("gpu", left.gpu, right.gpu);
  compareDeepVariantField("displaySize", left.displaySize, right.displaySize);
  compareDeepVariantField("resolution", left.resolution, right.resolution);
  compareDeepVariantField("refreshRate", left.refreshRate, right.refreshRate);
  compareDeepVariantField("displayTechnology", left.displayTechnology, right.displayTechnology);
  compareDeepVariantField("batteryCapacity", left.batteryCapacity, right.batteryCapacity);
  compareDeepVariantField("cameraSpecs", left.cameraSpecs, right.cameraSpecs);
  compareDeepVariantField("connectivity", left.connectivity, right.connectivity);
  compareDeepVariantField("networkGeneration", left.networkGeneration, right.networkGeneration);
  compareDeepVariantField("operatingSystem", left.operatingSystem, right.operatingSystem);
  compareDeepVariantField("ports", left.ports, right.ports);
  compareDeepVariantField("wirelessStandards", left.wirelessStandards, right.wirelessStandards);
  compareDeepVariantField("generation", left.generation, right.generation);
  compareDeepVariantField("regionVersion", left.regionVersion, right.regionVersion);
  compareDeepVariantField("warranty", left.warranty, right.warranty);

  const finalScore = Math.min(score, 100);

  let decision: string;
  let similarityType: string;
  let isMatch = false;

  if (
    mismatchedFields.includes("brand") ||
    mismatchedFields.includes("model") ||
    mismatchedFields.includes("category") ||
    mismatchedFields.includes("productType") ||
    mismatchedFields.includes("accessory") ||
    mismatchedFields.includes("bundle")
  ) {
    decision = "No Match";
    similarityType = "Different Product";
    isMatch = false;
  } else if (
    mismatchedFields.includes("storage") ||
    mismatchedFields.includes("ram") ||
    mismatchedFields.includes("color") ||
    mismatchedFields.includes("variant") ||
    mismatchedFields.includes("processor") ||
    mismatchedFields.includes("gpu") ||
    mismatchedFields.includes("displaySize") ||
    mismatchedFields.includes("resolution") ||
    mismatchedFields.includes("refreshRate") ||
    mismatchedFields.includes("displayTechnology") ||
    mismatchedFields.includes("batteryCapacity") ||
    mismatchedFields.includes("cameraSpecs") ||
    mismatchedFields.includes("connectivity") ||
    mismatchedFields.includes("networkGeneration") ||
    mismatchedFields.includes("operatingSystem") ||
    mismatchedFields.includes("ports") ||
    mismatchedFields.includes("wirelessStandards") ||
    mismatchedFields.includes("generation") ||
    mismatchedFields.includes("regionVersion") ||
    mismatchedFields.includes("warranty")
  ) {
    decision = "Likely Match";
    if (mismatchedFields.includes("storage")) similarityType = "Different Storage Variant";
    else if (mismatchedFields.includes("ram")) similarityType = "Different RAM Variant";
    else if (mismatchedFields.includes("color")) similarityType = "Different Color Variant";
    else if (mismatchedFields.includes("variant")) similarityType = "Different Variant";
    else similarityType = "Different Variant";
    isMatch = false;
  } else if (finalScore >= 95) {
    decision = "Exact Match";
    similarityType = "Exact Product";
    isMatch = true;
  } else if (finalScore >= 80) {
    decision = "Likely Match";
    similarityType = "Similar Product";
    isMatch = true;
  } else {
    decision = "No Match";
    similarityType = "Different Product";
    isMatch = false;
  }

  return {
    score: finalScore,
    confidence: finalScore,
    decision,
    isMatch,
    matchedFields,
    mismatchedFields,
    similarityType
  };
}
