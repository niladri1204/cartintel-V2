import type {
  SellerType,
} from "./sellerSourceTypes";

export function classifySeller(
  source: string | null | undefined,
  seller: string | null | undefined
): {
  type: SellerType;
  confidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW";
} {
  if (!seller) {
    return {
      type: "UNKNOWN",
      confidence: "LOW",
    };
  }

  const normalizedSeller =
    seller.toLowerCase().trim();

  const normalizedSource =
    source?.toLowerCase().trim() ?? "";

  if (
    normalizedSeller ===
    normalizedSource
  ) {
    return {
      type: "PLATFORM",
      confidence: "HIGH",
    };
  }

  if (
    normalizedSeller.includes(
      normalizedSource
    )
  ) {
    return {
      type: "PLATFORM",
      confidence: "MEDIUM",
    };
  }

  return {
    type: "THIRD_PARTY",
    confidence: "MEDIUM",
  };
}
