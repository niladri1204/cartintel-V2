export type PriceConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INVALID";

export type PriceFlag =
  | "VALID"
  | "MISSING_PRICE"
  | "INVALID_PRICE"
  | "UNKNOWN_CURRENCY"
  | "NON_POSITIVE_PRICE"
  | "ORIGINAL_PRICE_BELOW_FINAL";

export interface PriceIntelligence {
  finalPrice: number | null;
  originalPrice: number | null;

  currency: string | null;

  confidence: PriceConfidence;

  flags: PriceFlag[];

  discountAmount: number | null;
  discountPercentage: number | null;
}
