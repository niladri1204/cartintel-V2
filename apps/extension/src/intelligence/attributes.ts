import { routeCategory, ProductCategoryType } from "./router";
import {
  extractElectronicsAttributes,
  extractFashionAttributes,
  extractBeautyAttributes,
  extractGroceryAttributes,
  extractFurnitureAttributes,
  extractBookAttributes,
  extractUnknownAttributes
} from "./extractors";

export interface ProductAttributes {
  storage: string | null;
  ram: string | null;
  color: string | null;
  size: string | null;
  variant: string | null;
  material: string | null;
  dimensions: string | null;
  weight: string | null;
  volume: string | null;
  gender: string | null;
  language: string | null;
  format: string | null;
  edition: string | null;
  packCount: string | null;
  processor: string | null;
  gpu: string | null;
  battery: string | null;
  display: string | null;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
}

export function createEmptyAttributes(): ProductAttributes {
  return {
    storage: null,
    ram: null,
    color: null,
    size: null,
    variant: null,
    material: null,
    dimensions: null,
    weight: null,
    volume: null,
    gender: null,
    language: null,
    format: null,
    edition: null,
    packCount: null,
    processor: null,
    gpu: null,
    battery: null,
    display: null,
    author: null,
    publisher: null,
    isbn: null
  };
}

/**
 * Attribute Extraction Dispatcher.
 * Routes category string/type to the dedicated category extractor.
 */
export function extractAttributes(tokens: string[], category?: string | null): ProductAttributes {
  const categoryType = routeCategory(category ?? null);

  switch (categoryType) {
    case ProductCategoryType.Electronics:
      return extractElectronicsAttributes(tokens);
    case ProductCategoryType.Fashion:
      return extractFashionAttributes(tokens);
    case ProductCategoryType.Beauty:
      return extractBeautyAttributes(tokens);
    case ProductCategoryType.Grocery:
      return extractGroceryAttributes(tokens);
    case ProductCategoryType.Furniture:
      return extractFurnitureAttributes(tokens);
    case ProductCategoryType.Books:
      return extractBookAttributes(tokens);
    case ProductCategoryType.Unknown:
    default:
      return extractUnknownAttributes(tokens);
  }
}
