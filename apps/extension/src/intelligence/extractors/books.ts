import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const BOOKS_FORMATS = new Set([
  "paperback",
  "hardcover",
  "hardback",
  "kindle",
  "ebook",
  "audiobook"
]);

const BOOKS_LANGUAGES = new Set([
  "english",
  "hindi",
  "bengali",
  "tamil",
  "telugu",
  "malayalam",
  "kannada",
  "marathi"
]);

const PAGE_COUNT_PATTERN = /^\d+pages?$/i;
const EDITION_PATTERN = /^(\d+(nd|rd|th)|revised|updated)$/i;

/**
 * Books Attribute Extractor V1.
 * Detects format (variant), page count (size), and internally tracks language and edition.
 */
export function extractBookAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  let size: string | null = null;
  let variant: string | null = null;
  let language: string | null = null;
  let edition: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // 1. Detect Format (stored in variant)
    if (!variant && BOOKS_FORMATS.has(lower)) {
      variant = lower;
    }

    // 2. Detect Language (internal)
    if (!language && BOOKS_LANGUAGES.has(lower)) {
      language = lower;
    }

    // 3. Detect Edition (internal)
    if (!edition && EDITION_PATTERN.test(lower)) {
      edition = lower;
    }

    // 4. Detect Size (page count)
    if (!size && PAGE_COUNT_PATTERN.test(lower)) {
      size = lower;
    }
  }

  return {
    ...createEmptyAttributes(),
    size,
    variant,
    language,
    edition
  };
}
