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

  // Phase 2.1 Deep Electronics Specifications
  displaySize: string | null;
  resolution: string | null;
  refreshRate: string | null;
  displayTechnology: string | null;
  batteryCapacity: string | null;
  chargingCapability: string | null;
  cameraSpecs: string | null;
  connectivity: string | null;
  networkGeneration: string | null;
  operatingSystem: string | null;
  ports: string | null;
  wirelessStandards: string | null;
  generation: string | null;
  regionVersion: string | null;
  warranty: string | null;
  variantSignature: string | null;
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
    isbn: null,

    displaySize: null,
    resolution: null,
    refreshRate: null,
    displayTechnology: null,
    batteryCapacity: null,
    chargingCapability: null,
    cameraSpecs: null,
    connectivity: null,
    networkGeneration: null,
    operatingSystem: null,
    ports: null,
    wirelessStandards: null,
    generation: null,
    regionVersion: null,
    warranty: null,
    variantSignature: null
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
