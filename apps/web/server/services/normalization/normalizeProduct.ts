import type { RawProductInput, NormalizedProduct } from './types';
import { NORMALIZATION_FLAGS } from './constants';

/**
 * Purpose: The core entry point for the Product Normalization Engine.
 * 
 * Responsibility:
 * 1. Validate the incoming raw product data.
 * 2. Sanitize and stabilize the product title.
 * 3. Initialize the NormalizedProduct model with safe default values.
 * 
 * Future Integration:
 * Rather than putting advanced extraction logic (like regex matching for storage or RAM)
 * directly into this file, future modules will be created as standalone plugins 
 * (e.g., `extractors/storageParser.ts`). This function will act as the orchestrator, 
 * passing the `NormalizedProduct` object through those plugins sequentially to populate the missing fields.
 */
export function normalizeProduct(raw: RawProductInput): NormalizedProduct {
  if (!raw || typeof raw !== 'object') {
    throw new Error("Invalid input: Product data is required.");
  }
  if (!raw.title || typeof raw.title !== 'string') {
    throw new Error("Invalid input: Product title is required for normalization.");
  }

  let title = raw.title;

  if (NORMALIZATION_FLAGS.LOWERCASE) {
    title = title.toLowerCase();
  }

  if (NORMALIZATION_FLAGS.STRIP_SPECIAL_CHARS) {
    // Strips out most non-alphanumeric characters but leaves spaces and hyphens
    title = title.replace(/[^\w\s-]/g, '');
  }

  if (NORMALIZATION_FLAGS.CONDENSE_SPACES) {
    title = title.replace(/\s+/g, ' ').trim();
  }

  // Basic normalization for brand and category
  const brand = raw.brand ? raw.brand.trim().toLowerCase() : null;
  const category = raw.category ? raw.category.trim().toLowerCase() : null;
  const currency = raw.currency ? raw.currency.trim().toUpperCase() : null;

  return {
    originalTitle: raw.title,
    normalizedTitle: title,
    tokens: [],
    
    brand,
    model: null,
    color: null,
    storage: null,
    ram: null,
    size: null,
    
    category,
    marketplace: null,
    
    basePrice: raw.price ?? null,
    currency,
    
    unknownAttributes: [],
  };
}
