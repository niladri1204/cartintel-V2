import { normalizeString } from "./normalizer";
import { tokenize } from "./tokenizer";
import { inferCategoryAndType } from "./category";
import { extractQuantity } from "./quantity";

import { extractBrand } from "./brand";
import { extractModel } from "./model";
import { extractAttributes } from "./attributes";

export interface ParsedProduct {
  normalizedTitle: string | null;
  tokens: string[];
  category: string | null;
  brand: string | null;
  quantity: number | null;
  unit: string | null;
  packSize: number | null;
  subcategory: string | null;
  productType: string | null;
  variant: string | null;
  color: string | null;
  model: string | null;
  size: string | null;
  material: string | null;
  gender: string | null;
  storage: string | null;
  ram: string | null;
  packCount: number | null;
  language: string | null;
  edition: string | null;
  attributes: string[];
}

/**
 * Extracts raw values from the detected title by passing it through the intelligence modules.
 */
export function parseProductTitle(originalTitle: string | null): ParsedProduct {
  const normalizedTitle = normalizeString(originalTitle);
  const tokens = tokenize(normalizedTitle);
  const categoryInfo = inferCategoryAndType(normalizedTitle);

  const quantityInfo = extractQuantity(normalizedTitle);

  const brand = extractBrand(tokens);
  const attributesInfo = extractAttributes(tokens, categoryInfo.category);

  return {
    normalizedTitle,
    tokens,
    category: categoryInfo.category,
    brand,
    ...quantityInfo,
    subcategory: null,
    productType: categoryInfo.productType,
    variant: attributesInfo.variant,
    color: attributesInfo.color,
    model: extractModel(originalTitle, normalizedTitle, tokens, brand, attributesInfo),
    size: attributesInfo.size,
    material: attributesInfo.material,
    gender: attributesInfo.gender,
    storage: attributesInfo.storage,
    ram: attributesInfo.ram,
    packCount: attributesInfo.packCount ? parseInt(attributesInfo.packCount, 10) || null : null,
    language: attributesInfo.language,
    edition: attributesInfo.edition,
    attributes: []
  };
}
