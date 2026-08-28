import type { ProductIntelligence } from "./types";
import { parseProductTitle } from "./parser";
import { generateFingerprint } from "./fingerprint";
import { normalizeMarketplaceName } from "./marketplace";

export interface RawDetectionData {
  title: string | null;
  brand?: string | null;
  price: number | null;
  currency: string | null;
  image: string | null;
  url: string | null;
  hostname?: string;
}

/**
 * Calculates a deterministic, weighted confidence score (0 - 100) based on extracted intelligence signals.
 */
export function calculateConfidence(
  title: string | null,
  brand: string | null,
  model: string | null,
  category: string | null,
  fingerprint: string,
  storage: string | null,
  ram: string | null,
  variant: string | null,
  color: string | null,
  brandConfidence?: number
): number {
  if (!title || title.trim().length === 0) {
    return 0;
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 3) {
    return 0; // Garbage / minimal title
  }

  let score = 0;

  // 1. Base Title Signal (Max 15 points)
  if (trimmedTitle.length < 6) {
    score += 5;
  } else if (trimmedTitle.length < 10) {
    score += 10;
  } else {
    score += 15;
  }

  const hasBrand = Boolean(brand && brand.trim().length > 0);
  const hasModel = Boolean(model && model.trim().length > 0);
  const hasCategory = Boolean(category && category.trim().length > 0 && category.toLowerCase() !== 'uncategorized');

  // 2. Core Identity Signals (Max 65 points)
  if (hasBrand) {
    const bConf = brandConfidence !== undefined ? brandConfidence : 90;
    if (bConf >= 90) {
      score += 25;
    } else if (bConf >= 75) {
      score += 20;
    } else {
      score += 10;
    }
  }

  if (hasModel) {
    // Strong identity when coupled with a recognized brand
    score += hasBrand ? 25 : (model!.trim().length >= 3 ? 10 : 0);
  }

  if (hasCategory) {
    score += 15;
  }

  // 3. Fingerprint Signal (Max 10 points)
  if (fingerprint && fingerprint.trim().length > 0) {
    const parts = fingerprint.split('|').filter((p) => p.trim().length > 0);
    if (hasBrand && hasModel && parts.length >= 2) {
      score += 10;
    } else if (hasBrand || hasModel) {
      score += 5;
    }
  }

  // 4. Optional Spec & Attribute Signals (5 points each, up to 20 points)
  if (storage && storage.trim().length > 0) score += 5;
  if (ram && ram.trim().length > 0) score += 5;
  if (variant && variant.trim().length > 0) score += 5;
  if (color && color.trim().length > 0) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Combines every module into one ProductIntelligence object.
 */
export function processProduct(raw: RawDetectionData): ProductIntelligence {
  console.log("[2] Product identification started");
  const parsed = parseProductTitle(raw.title, raw.brand, raw.url);
  const fingerprint = generateFingerprint(
    parsed.brand,
    parsed.model,
    parsed.storage || null,
    parsed.ram || null,
    parsed.variant,
    parsed.color
  );

  const confidence = calculateConfidence(
    raw.title,
    parsed.brand,
    parsed.model,
    parsed.category,
    fingerprint,
    parsed.storage || null,
    parsed.ram || null,
    parsed.variant,
    parsed.color,
    parsed.brandConfidence
  );

  console.log("[3] Product identification completed");
  console.log(`[BRAND RESOLUTION] brand=${parsed.brand ?? "Unknown"} confidence=${parsed.brandConfidence ?? (parsed.brand ? 90 : 0)} source=${parsed.brandSource ?? "unresolved"} evidence="${parsed.brandEvidence?.join("; ") ?? "none"}"`);
  console.log(`[PRODUCT INTELLIGENCE] category=${parsed.category ?? "Unknown"} categoryConfidence=${parsed.category ? 90 : 0} productType=${parsed.productType ?? "Unknown"} model=${parsed.model ?? "Unknown"} fingerprint=${fingerprint} overallConfidence=${confidence}`);
  console.log(`[4] Normalized product:
    title: ${parsed.normalizedTitle}
    brand: ${parsed.brand}
    model: ${parsed.model}
    variant: ${parsed.variant}`);

  return {
    originalTitle: raw.title,
    originalPrice: raw.price,
    originalCurrency: raw.currency,
    originalImage: raw.image,
    originalUrl: raw.url,

    brand: parsed.brand,
    domain: parsed.domain,
    category: parsed.category,
    subcategory: parsed.subcategory,
    productType: parsed.productType,
    variant: parsed.variant,
    
    quantity: parsed.quantity,
    unit: parsed.unit,
    packSize: parsed.packSize,
    
    // Pass through parsed values directly
    color: parsed.color,
    model: parsed.model,
    size: parsed.size,
    material: parsed.material,
    dimensions: parsed.dimensions,
    author: parsed.author,
    publisher: parsed.publisher,
    isbn: parsed.isbn,
    format: parsed.format,
    gender: parsed.gender,
    storage: parsed.storage,
    ram: parsed.ram,
    packCount: parsed.packCount,
    language: parsed.language,
    edition: parsed.edition,
    volume: parsed.volume,
    weight: parsed.weight,
    shade: parsed.shade,
    formulation: parsed.formulation,
    ingredient: parsed.ingredient,
    flavor: parsed.flavor,
    spf: parsed.spf,
    skinType: parsed.skinType,
    attributes: parsed.attributes,

    processor: parsed.processor,
    gpu: parsed.gpu,
    displaySize: parsed.displaySize,
    resolution: parsed.resolution,
    refreshRate: parsed.refreshRate,
    displayTechnology: parsed.displayTechnology,
    batteryCapacity: parsed.batteryCapacity,
    chargingCapability: parsed.chargingCapability,
    cameraSpecs: parsed.cameraSpecs,
    connectivity: parsed.connectivity,
    networkGeneration: parsed.networkGeneration,
    operatingSystem: parsed.operatingSystem,
    ports: parsed.ports,
    wirelessStandards: parsed.wirelessStandards,
    generation: parsed.generation,
    regionVersion: parsed.regionVersion,
    warranty: parsed.warranty,
    variantSignature: parsed.variantSignature,
    
    normalizedTitle: parsed.normalizedTitle,

    metadata: {
      marketplace: normalizeMarketplaceName(null, raw.url, raw.hostname),
      hostname: raw.hostname || 'unknown',
      detectedAt: Date.now()
    },

    confidence,
    fingerprint
  };
}
