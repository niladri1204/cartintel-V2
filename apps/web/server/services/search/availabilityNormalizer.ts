import type {
  OfferAvailability,
} from "./offerTypes";

export function normalizeAvailability(
  value: string | null | undefined
): OfferAvailability {
  if (!value) {
    return "UNKNOWN";
  }

  const normalized =
    value
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  // -----------------------------------------
  // Explicitly unavailable
  // -----------------------------------------

  if (
    normalized.includes("out of stock") ||
    normalized.includes("out-of-stock") ||
    normalized.includes("unavailable") ||
    normalized.includes("sold out") ||
    normalized.includes("currently unavailable")
  ) {
    return "OUT_OF_STOCK";
  }

  // -----------------------------------------
  // Preorder
  // -----------------------------------------

  if (
    normalized.includes("preorder") ||
    normalized.includes("pre-order") ||
    normalized.includes("coming soon")
  ) {
    return "PREORDER";
  }

  // -----------------------------------------
  // Low / limited stock
  // -----------------------------------------

  if (
    normalized.includes("only") &&
    normalized.includes("left")
  ) {
    return "LOW_STOCK";
  }

  if (
    normalized.includes("limited stock") ||
    normalized.includes("low stock") ||
    normalized.includes("few left") ||
    normalized.includes("hurry")
  ) {
    return "LOW_STOCK";
  }

  // -----------------------------------------
  // Available
  // -----------------------------------------

  if (
    normalized.includes("in stock") ||
    normalized.includes("available") ||
    normalized.includes("ships") ||
    normalized.includes("ready to ship")
  ) {
    return "IN_STOCK";
  }

  return "UNKNOWN";
}
