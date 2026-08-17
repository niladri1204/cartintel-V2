import type {
  SourceType,
} from "./sellerSourceTypes";

export function classifySource(
  source: string | null | undefined
): SourceType {
  if (!source) {
    return "UNKNOWN";
  }

  const normalized =
    source.toLowerCase().trim();

  const marketplaces = [
    "amazon",
    "flipkart",
    "ebay",
    "walmart",
    "etsy",
  ];

  const directRetailers = [
    "croma",
    "reliance digital",
    "best buy",
    "apple",
    "samsung",
    "nike",
  ];

  if (
    marketplaces.some(
      marketplace =>
        normalized.includes(
          marketplace
        )
    )
  ) {
    return "MARKETPLACE";
  }

  if (
    directRetailers.some(
      retailer =>
        normalized.includes(
          retailer
        )
    )
  ) {
    return "DIRECT_RETAILER";
  }

  return "UNKNOWN";
}
