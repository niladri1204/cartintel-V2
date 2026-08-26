export const ProductCategoryType = {
  Electronics: 0,
  Fashion: 1,
  Beauty: 2,
  Grocery: 3,
  Furniture: 4,
  Books: 5,
  Unknown: 6,
} as const;

export type ProductCategoryType = (typeof ProductCategoryType)[keyof typeof ProductCategoryType];

/**
 * Category Routing Engine.
 * Maps category string to ProductCategoryType for downstream extractor routing.
 */
export function routeCategory(category: string | null): ProductCategoryType {
  if (!category) {
    return ProductCategoryType.Unknown;
  }

  const normalized = category.toLowerCase();

  if (
    normalized.includes("electronics") ||
    normalized.includes("mobile") ||
    normalized.includes("phone") ||
    normalized.includes("smartphone") ||
    normalized.includes("tablet") ||
    normalized.includes("gadget") ||
    normalized.includes("laptop") ||
    normalized.includes("computer")
  ) {
    return ProductCategoryType.Electronics;
  }
  if (
    normalized.includes("fashion") ||
    normalized.includes("clothing") ||
    normalized.includes("apparel") ||
    normalized.includes("footwear")
  ) {
    return ProductCategoryType.Fashion;
  }
  if (
    normalized.includes("beauty") ||
    normalized.includes("cosmetic") ||
    normalized.includes("skincare") ||
    normalized.includes("personal care")
  ) {
    return ProductCategoryType.Beauty;
  }
  if (
    normalized.includes("grocery") ||
    normalized.includes("food") ||
    normalized.includes("snack") ||
    normalized.includes("beverage")
  ) {
    return ProductCategoryType.Grocery;
  }
  if (
    normalized.includes("furniture") ||
    normalized.includes("home") ||
    normalized.includes("living")
  ) {
    return ProductCategoryType.Furniture;
  }
  if (
    normalized.includes("book") ||
    normalized.includes("media") ||
    normalized.includes("publication")
  ) {
    return ProductCategoryType.Books;
  }

  return ProductCategoryType.Unknown;
}

