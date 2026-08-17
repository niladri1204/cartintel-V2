import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const BEAUTY_COLORS = new Set([
  "black",
  "white",
  "red",
  "pink",
  "gold",
  "silver"
]);

const BEAUTY_VARIANTS = new Set([
  "serum",
  "cream",
  "gel",
  "facewash",
  "shampoo",
  "conditioner",
  "oil",
  "lotion",
  "toner"
]);

const BEAUTY_VOLUME_PATTERN = /^\d+(ml|l)$/i;

/**
 * Beauty Attribute Extractor V1.
 * Detects volume (stored in size), variant, and color from tokens.
 */
export function extractBeautyAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  let color: string | null = null;
  let size: string | null = null;
  let variant: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // 1. Volume -> size
    if (!size && BEAUTY_VOLUME_PATTERN.test(lower)) {
      size = lower;
    }

    // 2. Variant
    if (!variant && BEAUTY_VARIANTS.has(lower)) {
      variant = lower;
    }

    // 3. Color
    if (!color && BEAUTY_COLORS.has(lower)) {
      color = lower;
    }
  }

  return {
    ...createEmptyAttributes(),
    color,
    size,
    variant
  };
}
