import type { ProductContext } from "../recommendationTypes";
import { inferCategoryAndType } from "../category";
import { extractBrand } from "../brand";

/**
 * Deterministically extracts ProductContext (category and brand) from a normalized query.
 * Reuses existing category inference rules from category.ts and brand extraction from brand.ts directly.
 *
 * @param normalizedQuery The normalized query string.
 * @returns ProductContext object containing category and brand, or null if neither could be extracted.
 */
export function extractProductContext(normalizedQuery: string | null | undefined): ProductContext | null {
  if (!normalizedQuery || normalizedQuery.trim().length === 0) {
    return null;
  }

  const query = normalizedQuery.trim().toLowerCase();

  // 1. Infer category & productType using existing taxonomy semantics
  const inferResult = inferCategoryAndType(query);
  let category: string | null = null;

  if (inferResult.productType) {
    category = inferResult.productType.toLowerCase();
  } else if (inferResult.category && inferResult.category !== "Uncategorized") {
    category = inferResult.category.toLowerCase();
  }

  // 2. Extract brand using existing brand.ts authority directly
  const tokens = query.split(/\s+/);
  const brand = extractBrand(tokens);

  if (!category && !brand) {
    return null;
  }

  return {
    category,
    brand
  };
}
