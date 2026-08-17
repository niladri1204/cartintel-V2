export function normalizePrice(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[₹$€£]/g, "")
    .replace(/[^\d.]/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function calculateDiscount(
  originalPrice: number | null,
  finalPrice: number | null
): {
  amount: number | null;
  percentage: number | null;
} {
  if (
    originalPrice === null ||
    finalPrice === null ||
    originalPrice <= 0 ||
    finalPrice > originalPrice
  ) {
    return {
      amount: null,
      percentage: null,
    };
  }

  const amount =
    originalPrice - finalPrice;

  const percentage =
    (amount / originalPrice) * 100;

  return {
    amount,
    percentage:
      Math.round(percentage * 100) / 100,
  };
}
