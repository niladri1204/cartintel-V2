export function normalizeIdentityValue(
  value: string | null | undefined
): string {
  if (!value) return "";

  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeModel(
  value: string | null | undefined
): string {
  if (!value) return "";

  return normalizeIdentityValue(value)
    .replace(/\b(model|no|number)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCapacity(
  value: string | null | undefined
): string {
  if (!value) return "";

  return normalizeIdentityValue(value)
    .replace(/\s+/g, "")
    .replace(/gigabytes?/g, "gb")
    .replace(/terabytes?/g, "tb");
}
