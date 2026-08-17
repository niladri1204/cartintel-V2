/**
 * Purpose: Defines the foundational data contracts for the Product Normalization Engine.
 * Future extraction modules will strictly adhere to these interfaces to ensure predictable
 * outputs across the entire backend architecture.
 */

/**
 * Represents the raw, unstructured product data scraped or ingested from external sources.
 */
export interface RawProductInput {
  title: string;
  price?: number | null;
  currency?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
}

/**
 * Represents a cleanly formatted, predictable product object. 
 * Future plugins (e.g., brand extractor, RAM parser) will incrementally populate these fields.
 */
export interface NormalizedProduct {
  originalTitle: string;
  normalizedTitle: string;
  tokens?: string[];
  
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  size?: string | null;
  
  category?: string | null;
  marketplace?: string | null;
  
  basePrice?: number | null;
  currency?: string | null;
  
  unknownAttributes?: string[];
}
