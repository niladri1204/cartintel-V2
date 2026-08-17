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

  offers: ProductOffer[];
}
