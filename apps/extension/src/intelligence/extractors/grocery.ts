// @ts-nocheck
import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const GROCERY_VARIANTS = new Set([
  "tea",
  "coffee",
  "rice",
  "milk",
  "juice",
  "biscuits",
  "chips",
  "chocolate"
]);

const GROCERY_SIZE_PATTERN = /^\d+(g|kg|ml|l)$/i;
const PACK_X_PATTERN = /^x(\d+)$/i;
const PACK_OF_NUM_PATTERN = /^packof(\d+)$/i;

/**
 * Grocery Attribute Extractor V1.
 * Detects weight/volume (stored in size) and pack count/grocery type (stored in variant).
 */
export function extractGroceryAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  let size: string | null = null;
  let itemVariant: string | null = null;
  let packCountStr: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const lower = tokens[i].toLowerCase();

    // 1. Weight / Volume -> size
    if (!size) {
      const match = lower.match(GROCERY_SIZE_PATTERN);
      if (match) {
        const qty = parseFloat(match[1] || "0");
        const unit = match[2]?.toLowerCase() || "";
        size = `${qty}${unit}`;
      }
    }

    // 2. Grocery Item Variant
    if (!itemVariant && GROCERY_VARIANTS.has(lower)) {
      itemVariant = lower;
    }

    // 3. Pack Count detection (e.g. x2, x3, packof2, pack of 2)
    if (!packCountStr) {
      const xMatch = lower.match(PACK_X_PATTERN);
      if (xMatch) {
        packCountStr = `pack of ${xMatch[1] || "1"}`;
      } else {
        const packOfMatch = lower.match(PACK_OF_NUM_PATTERN);
        if (packOfMatch) {
          packCountStr = `pack of ${packOfMatch[1] || "1"}`;
        } else if (lower === "packof" && i < tokens.length - 1 && /^\d+$/.test(tokens[i + 1])) {
          packCountStr = `pack of ${tokens[i + 1]}`;
        } else if (lower === "pack") {
          if (i < tokens.length - 2 && tokens[i + 1].toLowerCase() === "of" && /^\d+$/.test(tokens[i + 2])) {
            packCountStr = `pack of ${tokens[i + 2]}`;
          } else if (i < tokens.length - 1 && /^\d+$/.test(tokens[i + 1])) {
            packCountStr = `pack of ${tokens[i + 1]}`;
          }
        }
      }
    }
  }

  return {
    ...createEmptyAttributes(),
    size,
    variant: itemVariant,
    packCount: packCountStr
  };
}

