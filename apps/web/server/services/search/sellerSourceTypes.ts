export type SourceType =
  | "MARKETPLACE"
  | "DIRECT_RETAILER"
  | "UNKNOWN";

export type SellerType =
  | "PLATFORM"
  | "THIRD_PARTY"
  | "UNKNOWN";

export interface SellerSourceIntelligence {
  source: string;
  sourceType: SourceType;

  seller: string | null;
  sellerType: SellerType;

  sourceConfidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  sellerConfidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  flags: string[];
}
