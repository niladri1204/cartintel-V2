export interface ProductOffer {
  id: string;

  source: string;
  seller?: string | null;

  title: string;

  price?: number | null;
  currency?: string | null;

  url: string;
  imageUrl?: string | null;

  availability?: string | null;

  identity: {
    confidence:
      | "EXACT"
      | "HIGH_CONFIDENCE"
      | "POSSIBLE";

    score: number;
  };

  googleProductId?: string | null;
  googleImmersiveToken?: string | null;
  googleShoppingProductLink?: string | null;
  marketplaceLogo?: string | null;
  searchQuery?: string;
  searchRank?: number;
  identifiers?: {
    gtin?: string | null;
    ean?: string | null;
    upc?: string | null;
    mpn?: string | null;
    sku?: string | null;
    modelNumber?: string | null;
  };
  rating?: number | null;
  deliveryInfo?: string | null;
}


export interface CanonicalProduct {
  id: string;

  title: string;

  brand?: string | null;
  model?: string | null;
  variant?: string | null;

  category?: string | null;
  productType?: string | null;

  color?: string | null;
  size?: string | null;

  storage?: string | null;
  ram?: string | null;

  fingerprint?: string | null;

  googleProductId?: string | null;

  offers: ProductOffer[];
}

