/**
 * Purpose: A centralized dictionary of configuration flags, known entities, and regex patterns.
 * By keeping this separate, future extraction modules can easily reference shared patterns
 * (e.g., standard categories) without duplicating logic across multiple files.
 */
export const NORMALIZATION_FLAGS = {
  STRIP_SPECIAL_CHARS: true,
  LOWERCASE: true,
  CONDENSE_SPACES: true,
};

export const KNOWN_MARKETPLACES = [
  'Amazon',
  'Flipkart',
  'Myntra',
  'Ajio',
  'Nykaa',
  'Purplle',
  'Croma',
  'Reliance Digital',
  'Blinkit',
  'Zepto',
  'BigBasket'
];

export const SUPPORTED_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Beauty & Personal Care',
  'Grocery',
  'Home & Kitchen',
  'Uncategorized'
];

export const PLACEHOLDERS = {
  UNKNOWN_BRAND: 'Unknown Brand',
  UNKNOWN_CATEGORY: 'Uncategorized',
  UNKNOWN_MARKETPLACE: 'Unknown Store',
};

export const REGEX_COLLECTIONS = {
  // Empty placeholders for future advanced extraction rules
  COLOR_MATCHERS: [] as RegExp[],
  SIZE_MATCHERS: [] as RegExp[],
  STORAGE_MATCHERS: [] as RegExp[],
  RAM_MATCHERS: [] as RegExp[],
  GENDER_MATCHERS: [] as RegExp[],
};

export const CATEGORY_MAPPINGS: Record<string, string> = {};
export const BRAND_MAPPINGS: Record<string, string> = {};
