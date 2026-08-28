export interface ExtractedData {
  title?: string | null;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
}

export interface MarketplaceProvider {
  /**
   * Returns true if this provider applies to the current hostname.
   */
  matches(hostname: string): boolean;
  
  /**
   * Extracts marketplace-specific data.
   * Fields left undefined/null will use generic fallback.
   */
  extract(): ExtractedData;
}
