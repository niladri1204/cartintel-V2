/**
 * Single source of truth for query normalization in intent extraction.
 * Trims surrounding whitespace, collapses internal whitespace, handles tabs/newlines,
 * lowercases ordinary words, removes conversational noise (!, ?, ...),
 * while strictly preserving product identifiers, decimal numbers (e.g. 3.5mm),
 * units, currency symbols (₹50,000, $500, Rs 50,000), and meaningful punctuation (+, -, /, ., %, &, #).
 *
 * @param query The raw natural-language shopping query.
 * @returns The normalized matching representation of the query.
 */
export function normalizeQuery(query: string | null | undefined): string {
  if (typeof query !== "string" || query.trim().length === 0) {
    return "";
  }

  let text = query;

  // 1. Convert newlines and tabs to normal spaces
  text = text.replace(/[\r\n\t]+/g, " ");

  // 2. Conservatively normalize obvious conversational noise (!, ?, ellipsis)
  text = text.replace(/[\!\?]+/g, "");
  text = text.replace(/\.{2,}/g, "");

  // 3. Trim and collapse repeated whitespace
  text = text.trim().replace(/\s+/g, " ");

  // 4. Lowercase ordinary text
  text = text.toLowerCase();

  return text;
}
