// @ts-nocheck
import { extractBrand } from "./brand";
import type { ProductAttributes } from "./attributes";

const NON_MODEL_TOKENS = new Set([
  "with", "for", "by", "and", "or", "edition", "version", "new", "latest",
  "official", "original", "genuine", "authentic", "5g", "4g", "lte", "wifi",
  "bluetooth", "camera", "cameras", "rear", "front", "triple", "dual", "quad",
  "single", "selfie", "sensor", "display", "screen", "amoled", "oled", "lcd",
  "ltps", "flexible", "flex", "refresh", "rate", "processor", "chipset",
  "snapdragon", "dimensity", "exynos", "bionic", "octa", "core", "battery",
  "charging", "charger", "watt", "watts", "fast", "storage", "ram", "memory",
  "color", "colors", "variant", "special", "dark", "light", "tws", "wireless",
  "earbuds", "earphones", "headphones", "smartphone", "mobile", "device",
  "refurbished", "pre-owned", "renewed", "used", "unboxed"
]);

/**
 * Normalizes model names for clean comparisons.
 * e.g., "Phone (3)" -> "phone (3)", "Phone 2a" -> "phone 2a", "S25+" -> "s25 plus"
 */
export function normalizeModelName(model: string | null | undefined): string | null {
  if (!model) return null;
  let norm = model.trim().toLowerCase();

  // Normalize model suffixes like "+" -> "plus" (e.g. s25+ -> s25 plus)
  norm = norm.replace(/\b([a-z0-9]+)\s*\+/gi, "$1 plus");

  return norm
    .replace(/[()[\]]+/g, (match) => {
      if (/^\([a-z0-9]+\)$/i.test(match)) return match;
      return " ";
    })
    .replace(/\s+/g, " ")
    .replace(/\s+\($/g, "")
    .trim();
}

/**
 * Model Extraction Module.
 * Isolates the canonical model / product family name from the title,
 * stripping brand, extracted attributes, spec noise, and secondary title clauses.
 */
export function extractModel(
  originalTitle: string | null | undefined,
  normalizedTitle: string | null | undefined,
  tokens: string[],
  brand?: string | null,
  attributes?: ProductAttributes | null
): string | null {
  let titleToUse = originalTitle || normalizedTitle || (tokens ? tokens.join(" ") : "");
  if (!titleToUse || titleToUse.trim().length === 0) {
    return null;
  }

  const detectedBrand = brand !== undefined ? brand : extractBrand(tokens);
  const lowerBrand = detectedBrand ? detectedBrand.toLowerCase() : null;

  // 1. Remove parenthesized spec/attribute clauses from full title BEFORE clause splitting
  titleToUse = titleToUse.replace(/\(([^)]*(?:ram|storage|gb|tb|black|white|blue|red|green|yellow|silver|gold|grey|gray|dark)[^)]*)\)/gi, "");

  // 2. Split title by major clause separators (| , - – —)
  const segments = titleToUse.split(/[|,\-–—]/);
  let primarySegment = segments[0]?.trim() || "";

  if (primarySegment.length === 0 && segments.length > 1) {
    primarySegment = segments[1]?.trim() || "";
  }

  let text = primarySegment.toLowerCase();

  // 3. Remove brand from primary segment
  if (lowerBrand && text.startsWith(lowerBrand)) {
    text = text.slice(lowerBrand.length).trim();
  } else if (lowerBrand) {
    const brandRegex = new RegExp(`\\b${lowerBrand}\\b`, "i");
    text = text.replace(brandRegex, "").trim();
  }

  // 4. Remove structured spec patterns (dual capacities, RAM, Storage, MP, Hz, mAh, W, Processor names, volume/weight)
  text = text
    .replace(/\b\d+\s*(?:gb|tb|mb)[\/+,\s]*\d+\s*(?:gb|tb|mb)\b/gi, "")
    .replace(/\b\d+\s*(?:gb|tb|mb)\s*ram\b/gi, "")
    .replace(/\b\d+\s*(?:gb|tb|mb)\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:ml|l|g|kg|oz|fl\s*oz|pcs|pieces)\b/gi, "")
    .replace(/\b\d+mp\b/gi, "")
    .replace(/\b\d+hz\b/gi, "")
    .replace(/\b\d+mah\b/gi, "")
    .replace(/\b\d+w\b/gi, "")
    .replace(/\b1\.\d+k\+?\b/gi, "")
    .replace(/\bsnapdragon\s+[a-z0-9\s]+/gi, "")
    .replace(/\bdimensity\s+\d+/gi, "")
    .replace(/\bexynos\s+\d+/gi, "")
    .replace(/\bapple\s+a\d+(?:\s+pro)?\b/gi, "")
    .replace(/\b5g\b/gi, "")
    .replace(/\b4g\b/gi, "");

  // 5. Remove color words directly
  text = text.replace(/\b(?:dark|light)?\s*(?:black|white|blue|red|green|yellow|silver|gold|grey|gray)\b/gi, "");

  if (attributes?.color) {
    const colorRegex = new RegExp(`\\b${attributes.color.toLowerCase()}\\b`, "gi");
    text = text.replace(colorRegex, "");
  }

  // 6. Tokenize remaining text and filter out spec noise
  const rawSubTokens = text.split(/\s+/).filter(Boolean);
  const modelTokens: string[] = [];

  for (const token of rawSubTokens) {
    let cleanToken = token;
    if (!/^\([a-z0-9]+\)$/i.test(token)) {
      cleanToken = token.replace(/^[^\w()+]+|[^\w()+]+$/g, "");
    }
    if (!cleanToken || cleanToken === "(" || cleanToken === ")") continue;

    const lowerToken = cleanToken.toLowerCase();

    // Preserve model indicators like "(3)", "(2a)", "(2)", "(a)", "16", "pro", "max", "ultra", "s25", "s25+", "pixel", "cmf"
    const isModelPattern = /^\([a-z0-9]+\)$/i.test(cleanToken) || /^\d+[a-z]?\+?$/i.test(cleanToken);

    if (isModelPattern || (!NON_MODEL_TOKENS.has(lowerToken) && lowerToken.length > 0)) {
      modelTokens.push(cleanToken);
    }
  }

  if (modelTokens.length === 0) {
    const fallbackTokens = (tokens || []).filter((t) => !lowerBrand || t.toLowerCase() !== lowerBrand);
    return fallbackTokens.length > 0 ? normalizeModelName(fallbackTokens[0]) : null;
  }

  const result = modelTokens.join(" ");
  return normalizeModelName(result);
}


