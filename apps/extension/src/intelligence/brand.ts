import { KNOWN_BRANDS } from "./constants";

// Module-scoped lookup Set to avoid recreating on each extractBrand invocation
const BRAND_SET = new Set(KNOWN_BRANDS.map((b) => b.toLowerCase()));

/**
 * Brand Extraction Module.
 * Compares tokens against an explicit list of known brands and returns
 * the first matching brand found in the token sequence, or null if none match.
 */
export function extractBrand(tokens: string[]): string | null {
  if (!tokens || tokens.length === 0) {
    return null;
  }

  for (const token of tokens) {
    const normalizedToken = token.toLowerCase();
    if (BRAND_SET.has(normalizedToken)) {
      return normalizedToken;
    }
  }

  return null;
}
