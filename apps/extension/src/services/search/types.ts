export interface SearchRequest {
  normalizedTitle: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  productType: string | null;
  variant: string | null;
  color: string | null;
  storage: string | null;
  ram: string | null;
  fingerprint: string;
  googleProductId?: string;
  googleImmersiveToken?: string;
  useSellerExpansion?: boolean;
}

export interface RawProductResult {
  // Identity
  title: string;
  brand?: string | null;
  model?: string | null;

  // Commercial information
  price?: number | null;
  currency?: string | null;

  // Store information
  source: string;
  seller?: string | null;

  // Product information
  url: string;
  imageUrl?: string | null;

  // Availability
  availability?: string | null;

  // Search information
  searchQuery?: string;
  searchRank?: number;

  // Extracted identifiers
  identifiers?: {
    gtin?: string | null;
    ean?: string | null;
    upc?: string | null;
    mpn?: string | null;
    sku?: string | null;
    modelNumber?: string | null;
  };

  // Structured attributes
  attributes?: Record<string, string | number | boolean | null>;

  // Discovery metadata
  discovery?: {
    provider: string;
    queryType?: string;
    retrievedAt: string;
  };

  // Legacy/Provider fields
  image?: string;
  marketplace?: string;
  googleShoppingProductLink?: string | null;
  googleProductId?: string;
  googleImmersiveToken?: string;
  marketplaceLogo?: string | null;
  rating?: number;
  deliveryInfo?: string;
}

export interface SearchProvider {
  /** Unique identifier for the provider (e.g. 'amazon', 'google-shopping') */
  readonly id: string;
  
  /** Execute the search request on the provider's marketplace */
  search(request: SearchRequest): Promise<RawProductResult[]>;
}

export interface ProviderError {
  providerId: string;
  error: string;
}

export interface SearchResult {
  results: RawProductResult[];
  errors: ProviderError[];
}
