// @ts-nocheck
import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const FASHION_COLORS = new Set([
  "black",
  "white",
  "blue",
  "red",
  "green",
  "yellow",
  "pink",
  "purple",
  "gray",
  "grey",
  "brown",
  "beige",
  "navy",
  "maroon",
  "olive"
]);

const FASHION_SIZES = new Set([
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44"
]);

const FASHION_MATERIALS = new Set([
  "cotton",
  "polyester",
  "linen",
  "denim",
  "leather",
  "silk",
  "wool"
]);

const FASHION_VARIANTS = new Set([
  "slim",
  "regular",
  "oversized",
  "skinny",
  "relaxed",
  "cargo"
]);

const GENDER_MAP: Record<string, string> = {
  men: "men",
  mens: "men",
  women: "women",
  womens: "women",
  unisex: "unisex",
  boys: "boys",
  girls: "girls",
  kids: "kids"
};

/**
 * Fashion Attribute Extractor V1.
 * Detects color, size, variant (and internally gender & material) from tokens.
 */
export function extractFashionAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  let color: string | null = null;
  let size: string | null = null;
  let variant: string | null = null;
  let gender: string | null = null;
  let material: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // 1. Detect Color (first match)
    if (!color && FASHION_COLORS.has(lower)) {
      color = lower;
    }

    // 2. Detect Gender (internal detection)
    if (!gender && lower in GENDER_MAP) {
      gender = GENDER_MAP[lower];
    }

    // 3. Detect Size (first match)
    if (!size && FASHION_SIZES.has(lower)) {
      size = lower;
    }

    // 4. Detect Material (internal detection)
    if (!material && FASHION_MATERIALS.has(lower)) {
      material = lower;
    }

    // 5. Detect Variant (first match)
    if (!variant && FASHION_VARIANTS.has(lower)) {
      variant = lower;
    }
  }

  return {
    ...createEmptyAttributes(),
    color,
    size,
    variant,
    material,
    gender
  };
}

