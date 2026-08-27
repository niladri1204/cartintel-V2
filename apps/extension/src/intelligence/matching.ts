import type { ProductIntelligence } from "./types";
import { cleanSpecForComparison } from "./variant";
import { inferDomain, areDomainsCompatible } from "./domain";

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

const MODEL_MODIFIERS = new Set([
  "pro",
  "plus",
  "max",
  "ultra",
  "mini",
  "fe",
  "lite",
  "se",
  "fold",
  "flip",
  "edge",
  "prime",
  "play",
  "neo",
]);

function cleanModelTokens(str: string | null | undefined, brand?: string | null): string[] {
  if (!str) return [];
  let clean = str
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[()\-,/]/g, " ")
    .replace(/\b(32|64|128|256|512|1024)\s*(?:gb|tb)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:g|kg|ml|l|oz|fl\s*oz)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:cm|mm|m|in|ft|inch|inches)\b/gi, " ")
    .replace(/\b(?:uk|us|eu)\s*\d+(?:\.\d+)?\b/gi, " ")
    .replace(/\b\d+\s*x\s*\d+(?:\s*x\s*\d+)?\b/gi, " ")
    .replace(/\b\d+\s*gb\s*ram\b/gi, " ")
    .replace(/\b\d+(?:st|nd|rd|th)\b/gi, " ")
    .replace(/\b(\d+(?:st|nd|rd|th)\s*edition|revised\s*edition|special\s*edition)\b/gi, " ")
    .replace(/\b(paperback|hardcover|hardback|kindle|ebook|audiobook)\b/gi, " ")
    .replace(/\b([1-9]\s*seater)\b/gi, " ")
    .replace(/\b(english|hindi|bengali|tamil|telugu|marathi)\b/gi, " ")
    .replace(/\b(5g|4g|lte|wifi|cellular|unlocked)\b/gi, " ");

  if (brand) {
    clean = clean.replace(new RegExp(`\\b${brand.toLowerCase().trim()}\\b`, "gi"), " ");
  }

  return clean
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

export function areModelsMatching(
  leftModel?: string | null,
  rightModel?: string | null,
  brand?: string | null
): boolean {
  if (!leftModel || !rightModel) return false;

  const leftNorm = normalizeModelForMatching(leftModel);
  const rightNorm = normalizeModelForMatching(rightModel);
  if (leftNorm === rightNorm) return true;

  const leftTokens = cleanModelTokens(leftModel, brand);
  const rightTokens = cleanModelTokens(rightModel, brand);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return false;
  }

  // 1. Check for modifier conflicts (e.g. Pro vs non-Pro, Plus vs non-Plus, Ultra vs non-Ultra)
  for (const mod of MODEL_MODIFIERS) {
    const leftHasMod = leftTokens.includes(mod);
    const rightHasMod = rightTokens.includes(mod);
    if (leftHasMod !== rightHasMod) {
      return false; // Definite different model!
    }
  }

  // 2. Check numeric/code token consistency (e.g. "16" vs "15", "s24" vs "s23", "9a" vs "9")
  const leftNumTokens = leftTokens.filter(t => /\d/.test(t));
  const rightNumTokens = rightTokens.filter(t => /\d/.test(t));

  if (leftNumTokens.length > 0 && rightNumTokens.length > 0) {
    const hasSharedNum = leftNumTokens.some(t => rightNumTokens.includes(t));
    if (!hasSharedNum) {
      return false; // e.g. "16" vs "15"
    }
  }

  // 3. Check token subset: the shorter set of model tokens should be contained in the longer
  const [shorter, longer] =
    leftTokens.length <= rightTokens.length
      ? [leftTokens, rightTokens]
      : [rightTokens, leftTokens];
  const allShorterInLonger = shorter.every(t => longer.includes(t));
  if (allShorterInLonger) {
    return true;
  }

  return false;
}

export function compareProducts(
  left: ProductIntelligence,
  right: ProductIntelligence
): MatchResult {
  let score = 0;
  const matchedFields: string[] = [];
  const mismatchedFields: string[] = [];

  // 0. Hard Domain Boundary Check (ONLY when BOTH domains are non-General/Unknown and differ)
  const d1 = left.domain || inferDomain(left.category, left.normalizedTitle);
  const d2 = right.domain || inferDomain(right.category, right.normalizedTitle);
  if (!areDomainsCompatible(d1, d2)) {
    return {
      score: 0,
      confidence: 0,
      decision: "No Match",
      isMatch: false,
      matchedFields,
      mismatchedFields: ["domain"],
      similarityType: "Cross Domain Incompatibility"
    };
  }

  // 1. Core Identity: Brand Check
  if (isComparable(left.brand, right.brand)) {
    const b1 = left.brand!.trim().toLowerCase();
    const b2 = right.brand!.trim().toLowerCase();
    if (b1 === b2 || b1.startsWith(b2) || b2.startsWith(b1)) {
      matchedFields.push("brand");
      score += 20;
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
    if (areModelsMatching(left.model, right.model, left.brand || right.brand)) {
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
    score += 60;
  } else {
    // One has model and other doesn't, check if the one with model matches the other's title
    const withModel = normLeftModel ? left : right;
    const withoutModel = normLeftModel ? right : left;
    const modelTokens = cleanModelTokens(withModel.model, withModel.brand);
    const otherTitle = (withoutModel.originalTitle || withoutModel.normalizedTitle || "").toLowerCase();
    const hasModelInTitle = modelTokens.length > 0 && modelTokens.every(t => otherTitle.includes(t));
    if (hasModelInTitle) {
      score += 60;
      matchedFields.push("model");
    } else {
      score += 30;
    }
  }

function areCategoriesCompatible(cat1: string, cat2: string): boolean {
  const c1 = cat1.toLowerCase().trim();
  const c2 = cat2.toLowerCase().trim();
  if (c1 === c2 || c1 === "uncategorized" || c2 === "uncategorized") return true;

  const techSubstrings = [
    "electronic",
    "smartphone",
    "mobile",
    "phone",
    "cell",
    "telephony",
    "communication",
    "gadget",
    "tech",
    "computer",
    "laptop",
    "device"
  ];

  const c1IsTech = techSubstrings.some(s => c1.includes(s));
  const c2IsTech = techSubstrings.some(s => c2.includes(s));
  if (c1IsTech && c2IsTech) return true;

  return false;
}

function areProductTypesCompatible(pt1: string, pt2: string): boolean {
  const p1 = pt1.toLowerCase().trim();
  const p2 = pt2.toLowerCase().trim();
  if (p1 === p2) return true;

  const phoneTerms = ["smartphone", "mobile phone", "mobile", "phone", "cell phone"];
  const p1IsPhone = phoneTerms.some(s => p1.includes(s));
  const p2IsPhone = phoneTerms.some(s => p2.includes(s));
  if (p1IsPhone && p2IsPhone) return true;

  const genericFootwear = ["shoes", "shoe", "footwear"];
  if ((genericFootwear.includes(p1) || genericFootwear.includes(p2)) && (p1.includes("shoe") || p2.includes("shoe") || p1.includes("sneaker") || p2.includes("sneaker") || p1.includes("boot") || p2.includes("boot") || p1.includes("sandal") || p2.includes("sandal") || p1.includes("slide") || p2.includes("slide") || p1.includes("cleat") || p2.includes("cleat"))) {
    return true;
  }

  const genericApparel = ["apparel", "clothing", "garment"];
  if (genericApparel.includes(p1) || genericApparel.includes(p2)) {
    return true;
  }

  return false;
}

  // 2.5 Core Identity: Category & ProductType Check
  if (isComparable(left.productType, right.productType)) {
    const pt1 = left.productType!.trim().toLowerCase();
    const pt2 = right.productType!.trim().toLowerCase();
    if (pt1 && pt2 && pt1 !== "uncategorized" && pt2 !== "uncategorized") {
      if (areProductTypesCompatible(pt1, pt2)) {
        matchedFields.push("productType");
      } else {
        mismatchedFields.push("productType");
        return {
          score: 0,
          confidence: 0,
          decision: "No Match",
          isMatch: false,
          matchedFields,
          mismatchedFields,
          similarityType: "Different Product Type"
        };
      }
    }
  }

  // 2.5.1 Core Identity: Gender Target Conflict Check
  if (isComparable(left.gender, right.gender)) {
    const g1 = left.gender!.trim().toLowerCase();
    const g2 = right.gender!.trim().toLowerCase();
    if (g1 && g2 && g1 !== "unisex" && g2 !== "unisex" && g1 !== "unknown" && g2 !== "unknown") {
      if (g1 !== g2) {
        mismatchedFields.push("gender");
        return {
          score: 0,
          confidence: 0,
          decision: "No Match",
          isMatch: false,
          matchedFields,
          mismatchedFields,
          similarityType: "Gender Incompatibility"
        };
      } else {
        matchedFields.push("gender");
      }
    }
  }

  if (isComparable(left.category, right.category)) {
    const cat1 = left.category!.trim().toLowerCase();
    const cat2 = right.category!.trim().toLowerCase();
    if (cat1 && cat2 && cat1 !== "uncategorized" && cat2 !== "uncategorized") {
      if (areCategoriesCompatible(cat1, cat2)) {
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
    /\b(?:case|cover|skin|skins|wrap|wraps|decal|screen\s*protector|tempered\s*glass|protective\s*glass|screen\s*guard|phone\s*cover|mobile\s*cover|back\s*cover|bumper\s*case|charger|charging\s*cable|charging\s*adapter|adapter|cable|replacement\s*battery|battery\s*replacement|replacement\s*screen|replacement\s*display|lens\s*protector|camera\s*protector|keyboard\s*cover|laptop\s*sleeve|housing|body\s*housing|housing\s*panel|middle\s*frame|chassis|back\s*panel|smart\s*watch|smartwatch|watch\s+for|earphone|earphones|headphone|headphones|headset|neckband|earbuds|tws|in-ear|spare|spares|cellspare|folder|display\s*combo|user\s*guide|user\s*manual|manual|handbook|paperback|hardcover|tips\s*&\s*tricks|tips\s*and\s*tricks|compatible\s+for|designed\s+for|suitable\s+for|hard\s+back|soft\s+back|frosted\s+back|translucent\s+back|flip\s*cover|wallet\s*case)\b|हेडफ़ोन|इयरफ़ोन|कवर/i;

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
  compareVariantField("size", left.size, right.size, 5);

  // Beauty & Grocery Specific Variant Comparisons
  compareVariantField("volume", left.volume, right.volume, 5);
  compareVariantField("weight", left.weight, right.weight, 5);
  compareVariantField("packCount", left.packCount, right.packCount, 5);
  compareVariantField("shade", left.shade, right.shade, 5);
  compareVariantField("formulation", left.formulation, right.formulation, 5);
  compareVariantField("ingredient", left.ingredient, right.ingredient, 10);
  compareVariantField("flavor", left.flavor, right.flavor, 10);

  // Furniture & Books Specific Comparisons
  compareVariantField("dimensions", left.dimensions, right.dimensions, 5);
  compareVariantField("format", left.format, right.format, 5);
  compareVariantField("edition", left.edition, right.edition, 5);
  compareVariantField("language", left.language, right.language, 5);
  compareVariantField("isbn", left.isbn, right.isbn, 15);
  compareVariantField("author", left.author, right.author, 15);
  compareVariantField("publisher", left.publisher, right.publisher, 5);

  const leftForm = (left.formulation || "").toLowerCase();
  const rightForm = (right.formulation || "").toLowerCase();
  if ((leftForm.includes("zero") && !rightForm.includes("zero")) || (rightForm.includes("zero") && !leftForm.includes("zero"))) {
    mismatchedFields.push("formulation");
  }

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
    mismatchedFields.includes("bundle") ||
    mismatchedFields.includes("ingredient") ||
    mismatchedFields.includes("flavor") ||
    mismatchedFields.includes("author")
  ) {
    decision = "No Match";
    similarityType = "Different Product";
    isMatch = false;
  } else if (
    mismatchedFields.includes("storage") ||
    mismatchedFields.includes("ram") ||
    mismatchedFields.includes("color") ||
    mismatchedFields.includes("variant") ||
    mismatchedFields.includes("size") ||
    mismatchedFields.includes("volume") ||
    mismatchedFields.includes("weight") ||
    mismatchedFields.includes("packCount") ||
    mismatchedFields.includes("shade") ||
    mismatchedFields.includes("formulation") ||
    mismatchedFields.includes("dimensions") ||
    mismatchedFields.includes("format") ||
    mismatchedFields.includes("edition") ||
    mismatchedFields.includes("language") ||
    mismatchedFields.includes("processor") ||
    mismatchedFields.includes("gpu") ||
    mismatchedFields.includes("displaySize") ||
    mismatchedFields.includes("resolution") ||
    mismatchedFields.includes("refreshRate") ||
    mismatchedFields.includes("displayTechnology") ||
    mismatchedFields.includes("generation")
  ) {
    decision = "Likely Match";
    if (mismatchedFields.includes("storage")) similarityType = "Different Storage Variant";
    else if (mismatchedFields.includes("ram")) similarityType = "Different RAM Variant";
    else if (mismatchedFields.includes("volume") || mismatchedFields.includes("weight")) similarityType = "Different Quantity Variant";
    else if (mismatchedFields.includes("packCount")) similarityType = "Different Pack Variant";
    else if (mismatchedFields.includes("color")) similarityType = "Different Color Variant";
    else if (mismatchedFields.includes("format")) similarityType = "Different Format Variant";
    else if (mismatchedFields.includes("edition")) similarityType = "Different Edition Variant";
    else if (mismatchedFields.includes("dimensions")) similarityType = "Different Dimension Variant";
    else similarityType = "Different Variant";
    isMatch = false;
  } else if (finalScore >= 95) {
    const missingSpecs =
      (!left.storage && right.storage) || (left.storage && !right.storage) ||
      (!left.ram && right.ram) || (left.ram && !right.ram);
    decision = "Exact Match";
    similarityType = missingSpecs ? "Similar Product" : "Exact Product";
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
