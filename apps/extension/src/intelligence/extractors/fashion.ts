import { type ProductAttributes, createEmptyAttributes } from "../attributes";
import { parseFootwearSize } from "../footwearSize";

const COLOR_FAMILY_MAP: Record<string, string> = {
  black: "Black",
  dark: "Black",
  asphalt: "Black",
  onyx: "Black",
  charcoal: "Black",
  white: "White",
  triplewhite: "White",
  snow: "White",
  ivory: "White",
  blue: "Blue",
  navy: "Blue",
  indigo: "Blue",
  cyan: "Blue",
  azure: "Blue",
  red: "Red",
  maroon: "Red",
  crimson: "Red",
  scarlet: "Red",
  green: "Green",
  olive: "Green",
  emerald: "Green",
  yellow: "Yellow",
  gold: "Yellow",
  mustard: "Yellow",
  pink: "Pink",
  rose: "Pink",
  magenta: "Pink",
  purple: "Purple",
  violet: "Purple",
  lavender: "Purple",
  grey: "Grey",
  gray: "Grey",
  silver: "Grey",
  slate: "Grey",
  brown: "Brown",
  tan: "Brown",
  chocolate: "Brown",
  beige: "Beige",
  cream: "Beige",
  khaki: "Beige",
  orange: "Orange",
  amber: "Orange",
  coral: "Orange",
  multicolor: "Multicolor",
  multi: "Multicolor"
};

const FASHION_SIZES = new Set([
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "3xl",
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44"
]);

const FASHION_MATERIALS = new Set([
  "cotton",
  "polyester",
  "linen",
  "denim",
  "leather",
  "silk",
  "wool",
  "suede",
  "mesh",
  "canvas",
  "knit",
  "textile",
  "synthetic",
  "rubber"
]);

const FASHION_VARIANTS = new Set([
  "slim",
  "regular",
  "oversized",
  "skinny",
  "relaxed",
  "cargo"
]);

const GENDER_MAP: Record<string, string> = {
  men: "Men",
  mens: "Men",
  "men's": "Men",
  women: "Women",
  womens: "Women",
  "women's": "Women",
  unisex: "Unisex",
  boys: "Kids",
  girls: "Kids",
  kids: "Kids"
};

const FOOTWEAR_STYLES: Record<string, string> = {
  running: "Running",
  marathon: "Running",
  lifestyle: "Lifestyle",
  casual: "Casual",
  training: "Training",
  gym: "Training",
  basketball: "Basketball",
  football: "Football",
  cleats: "Football",
  tennis: "Tennis",
  court: "Court",
  hiking: "Hiking",
  trail: "Trail",
  formal: "Formal",
  oxford: "Formal",
  derby: "Formal",
  brogue: "Formal",
  loafer: "Formal",
  "slip-on": "Slip-on",
  slipon: "Slip-on",
  "high-top": "High-top",
  hightop: "High-top",
  "low-top": "Low-top",
  lowtop: "Low-top"
};

/**
 * Derives a canonical color family string from a raw color or title description.
 * Preserves the original raw color value while returning a standard color family.
 */
export function deriveColorFamily(rawColor: string | null | undefined): string | null {
  if (!rawColor || !rawColor.trim()) return null;
  const lower = rawColor.toLowerCase().replace(/[^a-z]/g, " ");
  const words = lower.split(/\s+/).filter(Boolean);

  if (words.length > 2 && (words.includes("black") || words.includes("white")) && (words.includes("red") || words.includes("blue") || words.includes("gum"))) {
    const primary = words.find(w => w in COLOR_FAMILY_MAP);
    if (primary) return COLOR_FAMILY_MAP[primary];
  }

  for (const word of words) {
    if (word in COLOR_FAMILY_MAP) {
      return COLOR_FAMILY_MAP[word];
    }
  }

  return null;
}

/**
 * Fashion & Footwear Attribute Extractor.
 * Extracts size (structured footwear vs clothing), gender, raw color, color family,
 * material (upper/sole), variant, and style/silhouette from tokens.
 */
export function extractFashionAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  const text = tokens.join(" ");
  let color: string | null = null;
  let size: string | null = null;
  let variant: string | null = null;
  let gender: string | null = null;
  let material: string | null = null;
  let style: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // 1. Detect Color (first match)
    if (!color && lower in COLOR_FAMILY_MAP) {
      color = lower;
    }

    // 2. Detect Gender
    if (!gender && lower in GENDER_MAP) {
      gender = GENDER_MAP[lower];
    }

    // 3. Detect Size (first match)
    if (!size && FASHION_SIZES.has(lower)) {
      size = lower;
    }

    // 4. Detect Material
    if (!material && FASHION_MATERIALS.has(lower)) {
      material = lower;
    }

    // 5. Detect Variant
    if (!variant && FASHION_VARIANTS.has(lower)) {
      variant = lower;
    }

    // 6. Detect Style / Silhouette
    if (!style && lower in FOOTWEAR_STYLES) {
      style = FOOTWEAR_STYLES[lower];
    }
  }

  // Multi-word material detection (e.g. "leather upper")
  const lowerText = text.toLowerCase();
  for (const mat of FASHION_MATERIALS) {
    if (lowerText.includes(`${mat} upper`)) {
      material = `${mat} upper`;
      break;
    }
  }

  // Multi-word style detection
  if (!style) {
    for (const [key, val] of Object.entries(FOOTWEAR_STYLES)) {
      if (lowerText.includes(key)) {
        style = val;
        break;
      }
    }
  }

  // Attempt Footwear Size parsing if UK/US/EU size pattern found
  const parsedFootwearSize = parseFootwearSize(text, gender);
  if (parsedFootwearSize) {
    size = parsedFootwearSize.rawSize;
  }

  // Upper material extraction
  let upperMaterial: string | null = null;
  const upperMatch = text.match(/\b(leather|suede|mesh|canvas|synthetic|textile|knit)\s*upper\b/i);
  if (upperMatch) upperMaterial = upperMatch[1].toLowerCase();

  const colorFamily = deriveColorFamily(color || text);

  return {
    ...createEmptyAttributes(),
    color: color || colorFamily,
    size,
    variant,
    style,
    material: upperMaterial 
      ? `${upperMaterial} upper` 
      : (material || null),
    gender
  };
}
