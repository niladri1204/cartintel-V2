export type AvailabilityConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type AvailabilityFlag =
  | "AVAILABLE"
  | "LOW_STOCK"
  | "PREORDER"
  | "UNAVAILABLE"
  | "UNKNOWN";

export interface AvailabilityIntelligence {
  status:
    | "IN_STOCK"
    | "LOW_STOCK"
    | "PREORDER"
    | "OUT_OF_STOCK"
    | "UNKNOWN";

  confidence: AvailabilityConfidence;

  purchasable: boolean;

  flags: AvailabilityFlag[];
}
