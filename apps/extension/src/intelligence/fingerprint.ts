
/**
 * Generates a deterministic canonical fingerprint string using important attributes.
 */
export function generateFingerprint(
  brand: string | null,
  model: string | null,
  storage: string | null,
  ram: string | null,
  variant: string | null,
  color: string | null
): string {
  // Normalize model to strip out generic terms that cause artificial fingerprint differences
  let cleanModel = model;
  if (cleanModel) {
    cleanModel = cleanModel.replace(/\b(5g|4g|smartphone|phone|mobile)\b/gi, "").trim();
  }

  const parts = [
    brand,
    cleanModel,
    storage,
    ram,
    variant,
    color
  ];

  const normalizedParts = parts
    .filter((p): p is string => p !== null && p !== undefined && p.trim() !== "")
    .map((p) => p.trim().toLowerCase().replace(/\s+/g, " "));

  return normalizedParts.join("|");
}
