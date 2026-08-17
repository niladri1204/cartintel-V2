// @ts-nocheck
import { PACK_REGEX, QUANTITY_REGEX } from "./constants";

export interface QuantityExtraction {
  quantity: number | null;
  unit: string | null;
  packSize: number | null;
}

/**
 * Extracts quantity, unit, and pack size from a normalized title.
 */
export function extractQuantity(normalizedTitle: string | null): QuantityExtraction {
  let quantity: number | null = null;
  let unit: string | null = null;
  let packSize: number | null = null;

  if (!normalizedTitle) {
    return { quantity, unit, packSize };
  }

  // Detect pack size: e.g. Pack of 2, Twin Pack, 3-pack
  const packMatch = normalizedTitle.match(PACK_REGEX);
  if (packMatch) {
    if (normalizedTitle.includes('twin pack')) {
      packSize = 2;
    } else {
      const parsed = parseInt(packMatch[1] || packMatch[2], 10);
      if (!isNaN(parsed)) packSize = parsed;
    }
  }

  // Detect quantity: e.g. 100ml, 100 ml, 2x100ml, 2 × 100 ml, 500g, 1kg
  const qtyMatch = normalizedTitle.match(QUANTITY_REGEX);
  if (qtyMatch) {
    if (qtyMatch[1]) {
      const parsedPack = parseInt(qtyMatch[1], 10);
      if (!isNaN(parsedPack)) packSize = parsedPack; // Overwrite if it's explicitly 2x100ml
    }
    
    const parsedQty = parseFloat(qtyMatch[2] || "0");
    if (!isNaN(parsedQty)) quantity = parsedQty;
    
    unit = qtyMatch[3] || null;
  }

  return { quantity, unit, packSize };
}

