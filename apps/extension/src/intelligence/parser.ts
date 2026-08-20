import { normalizeString } from "./normalizer";
import { tokenize } from "./tokenizer";
import { inferCategoryAndType } from "./category";
import { extractQuantity } from "./quantity";

import { extractBrand } from "./brand";
import { extractModel } from "./model";
import { extractAttributes } from "./attributes";
import { generateVariantSignature } from "./variant";

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

  // Phase 2.1 Deep Electronics Specifications
  processor: string | null;
  gpu: string | null;
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

  // Phase 2.2 Variant Intelligence
  variantSignature: string | null;
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

  const result: ParsedProduct = {
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
    attributes: [],

    processor: attributesInfo.processor,
    gpu: attributesInfo.gpu,
    displaySize: attributesInfo.displaySize,
    resolution: attributesInfo.resolution,
    refreshRate: attributesInfo.refreshRate,
    displayTechnology: attributesInfo.displayTechnology,
    batteryCapacity: attributesInfo.batteryCapacity,
    chargingCapability: attributesInfo.chargingCapability,
    cameraSpecs: attributesInfo.cameraSpecs,
    connectivity: attributesInfo.connectivity,
    networkGeneration: attributesInfo.networkGeneration,
    operatingSystem: attributesInfo.operatingSystem,
    ports: attributesInfo.ports,
    wirelessStandards: attributesInfo.wirelessStandards,
    generation: attributesInfo.generation,
    regionVersion: attributesInfo.regionVersion,
    warranty: attributesInfo.warranty,
    variantSignature: null
  };

  const tempProd: any = {
    originalTitle,
    normalizedTitle,
    ram: result.ram,
    storage: result.storage,
    processor: result.processor,
    gpu: result.gpu,
    displaySize: result.displaySize,
    resolution: result.resolution,
    refreshRate: result.refreshRate,
    displayTechnology: result.displayTechnology,
    batteryCapacity: result.batteryCapacity,
    cameraSpecs: result.cameraSpecs,
    connectivity: result.connectivity,
    networkGeneration: result.networkGeneration,
    operatingSystem: result.operatingSystem,
    ports: result.ports,
    wirelessStandards: result.wirelessStandards,
    generation: result.generation,
    regionVersion: result.regionVersion,
    warranty: result.warranty
  };

  result.variantSignature = generateVariantSignature(tempProd);
  return result;
}
