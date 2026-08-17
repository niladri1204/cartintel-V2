export type OfferAvailability =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "PREORDER"
  | "UNKNOWN";

export interface NormalizedOffer {
  id: string;

  productId: string;

  source: string;
  seller: string | null;

  title: string;

  url: string;
  imageUrl: string | null;

  pricing: {
    finalPrice: number | null;
    originalPrice: number | null;
    currency: string | null;

    discountAmount: number | null;
    discountPercentage: number | null;
  };

  availability: OfferAvailability;

  identity: {
    confidence:
      | "EXACT"
      | "HIGH_CONFIDENCE"
      | "POSSIBLE";

    score: number;
  };

  normalizedAt: string;

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


