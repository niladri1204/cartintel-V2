import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const FURNITURE_COLORS = new Set([
  "black",
  "white",
  "brown",
  "walnut",
  "oak",
  "teak",
  "mahogany",
  "grey",
  "gray",
  "beige"
]);

const FURNITURE_MATERIALS = new Set([
  "wood",
  "metal",
  "steel",
  "plastic",
  "glass",
  "engineeredwood",
  "plywood",
  "mdf",
  "bamboo",
  "rattan"
]);

const FURNITURE_VARIANTS = new Set([
  "chair",
  "table",
  "desk",
  "bed",
  "wardrobe",
  "cabinet",
  "sofa",
  "stool",
  "bookshelf",
  "tvunit",
  "dining",
  "office"
]);

const DIMENSION_PATTERN = /^\d+x\d+(?:x\d+)?$/i;
const UNIT_SIZE_PATTERN = /^\d+(cm|in|ft)$/i;

/**
 * Furniture Attribute Extractor V1.
 * Detects color, size (dimensions/lengths), variant, and material (internal) in a single pass.
 */
export function extractFurnitureAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  let color: string | null = null;
  let size: string | null = null;
  let variant: string | null = null;
  let material: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // 1. Detect Color (first match)
    if (!color && FURNITURE_COLORS.has(lower)) {
      color = lower;
    }

    // 2. Detect Material (internal detection)
    if (!material && FURNITURE_MATERIALS.has(lower)) {
      material = lower;
    }

    // 3. Detect Size (dimensions e.g. 120x60, 120x60x75 or unit lengths e.g. 120cm, 6ft)
    if (!size && (DIMENSION_PATTERN.test(lower) || UNIT_SIZE_PATTERN.test(lower))) {
      size = lower;
    }

    // 4. Detect Variant (first match)
    if (!variant && FURNITURE_VARIANTS.has(lower)) {
      variant = lower;
    }
  }

  return {
    ...createEmptyAttributes(),
    color,
    size,
    variant,
    material
  };
}
