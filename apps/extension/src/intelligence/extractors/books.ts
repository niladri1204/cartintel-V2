import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const BOOKS_FORMATS: Record<string, string> = {
  paperback: "Paperback",
  hardcover: "Hardcover",
  hardback: "Hardcover",
  kindle: "Kindle",
  ebook: "Kindle",
  audiobook: "Audiobook"
};

const BOOKS_LANGUAGES: Record<string, string> = {
  english: "English",
  hindi: "Hindi",
  bengali: "Bengali",
  tamil: "Tamil",
  telugu: "Telugu",
  malayalam: "Malayalam",
  kannada: "Kannada",
  marathi: "Marathi"
};

const KNOWN_PUBLISHERS = [
  "Penguin",
  "HarperCollins",
  "O'Reilly",
  "Pearson",
  "Simon & Schuster",
  "Random House",
  "Oxford",
  "Bloomsbury",
  "Scholastic",
  "McGraw-Hill",
  "Wiley"
];

/**
 * Books Attribute Extractor V2.
 * Detects ISBN, Author, Publisher, Format, Language, Edition, and Publication Year.
 */
export function extractBookAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  const text = tokens.join(" ");
  const lowerText = text.toLowerCase();

  let author: string | null = null;
  let publisher: string | null = null;
  let isbn: string | null = null;
  let format: string | null = null;
  let language: string | null = null;
  let edition: string | null = null;
  let size: string | null = null;
  let variant: string | null = null;

  // 1. ISBN Extraction (10 or 13 digit ISBN e.g. 978-0735211292, 9780735211292, 0735211299)
  const isbnMatch = lowerText.match(/\b(?:isbn:?\s*)?(97[89]\d{10}|\d{10})\b/i) || lowerText.match(/\b(97[89][-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?[\dxX])\b/i);
  if (isbnMatch) {
    const rawIsbn = isbnMatch[1] || isbnMatch[0];
    isbn = rawIsbn.replace(/[^0-9xX]/gi, "");
  }

  // 2. Author Extraction (e.g. "by James Clear", "by Cal Newport")
  const authorMatch = text.match(/\bby\s+([a-z]+(?:\s+[a-z]+){1,2})/i);
  if (authorMatch) {
    let rawAuthor = authorMatch[1].trim();
    for (const pub of KNOWN_PUBLISHERS) {
      rawAuthor = rawAuthor.replace(new RegExp(`\\s+${pub}$`, "i"), "");
    }
    rawAuthor = rawAuthor.replace(/\s+(isbn|paperback|hardcover|kindle|1st|2nd|3rd)$/i, "");
    author = rawAuthor.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }

  // 3. Publisher Extraction
  for (const pub of KNOWN_PUBLISHERS) {
    if (lowerText.includes(pub.toLowerCase())) {
      publisher = pub;
      break;
    }
  }

  // 4. Format Extraction
  for (const [key, name] of Object.entries(BOOKS_FORMATS)) {
    if (lowerText.includes(key)) {
      format = name;
      variant = name;
      break;
    }
  }

  // 5. Language Extraction
  for (const [key, name] of Object.entries(BOOKS_LANGUAGES)) {
    if (lowerText.includes(key)) {
      language = name;
      break;
    }
  }

  // 6. Edition Extraction (e.g. 1st Edition, 2nd Edition, Revised Edition)
  const editionMatch = lowerText.match(/\b(\d+(?:st|nd|rd|th)\s*edition|revised\s*edition|special\s*edition)\b/i);
  if (editionMatch) {
    edition = editionMatch[1];
  }

  // 7. Page Count Extraction (e.g. 320 pages)
  const pagesMatch = lowerText.match(/\b(\d+)\s*pages?\b/i);
  if (pagesMatch) {
    size = `${pagesMatch[1]} pages`;
  }

  return {
    ...createEmptyAttributes(),
    author,
    publisher,
    isbn,
    format,
    language,
    edition,
    size,
    variant
  };
}
