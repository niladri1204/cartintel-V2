import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const BEAUTY_INGREDIENTS: Record<string, string> = {
  niacinamide: "Niacinamide",
  "salicylic acid": "Salicylic Acid",
  salicylic: "Salicylic Acid",
  retinol: "Retinol",
  "vitamin c": "Vitamin C",
  vitaminc: "Vitamin C",
  "hyaluronic acid": "Hyaluronic Acid",
  hyaluronic: "Hyaluronic Acid",
  "glycolic acid": "Glycolic Acid",
  glycolic: "Glycolic Acid",
  centella: "Centella",
  cica: "Centella",
  peptides: "Peptides",
  ceramides: "Ceramides",
  "snail mucin": "Snail Mucin",
  "tea tree": "Tea Tree",
  teatree: "Tea Tree"
};

const BEAUTY_FORMULATIONS: Record<string, string> = {
  serum: "Serum",
  gel: "Gel",
  cream: "Cream",
  lotion: "Lotion",
  foam: "Foam",
  oil: "Oil",
  balm: "Balm",
  toner: "Toner",
  essence: "Essence",
  mist: "Mist",
  mask: "Mask"
};

const SKIN_TYPES: Record<string, string> = {
  oily: "Oily",
  dry: "Dry",
  combination: "Combination",
  sensitive: "Sensitive",
  all: "All Skin Types"
};

const BEAUTY_COLORS = new Set([
  "black",
  "white",
  "red",
  "pink",
  "gold",
  "silver",
  "blue",
  "green",
  "nude",
  "beige"
]);

/**
 * Beauty & Personal Care Attribute Extractor V2.
 * Extracts volume/weight, SPF, ingredient, formulation, shade, color, and skin type.
 */
export function extractBeautyAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  const text = tokens.join(" ");
  const lowerText = text.toLowerCase();

  let color: string | null = null;
  let size: string | null = null;
  let volume: string | null = null;
  let weight: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (!color && BEAUTY_COLORS.has(lower)) {
      color = lower;
    }
  }
  let spf: string | null = null;
  let ingredient: string | null = null;
  let formulation: string | null = null;
  let shade: string | null = null;
  let skinType: string | null = null;

  // 1. Volume & Weight extraction (e.g. 50ml, 100ml, 50g, 100g, 1 fl oz)
  const volMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\s*(ml|l|fl\s*oz|oz)\b/i);
  if (volMatch) {
    volume = `${volMatch[1]}${volMatch[2].replace(/\s+/g, "")}`;
    size = volume;
  }

  const weightMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\s*(g|kg)\b/i);
  if (weightMatch && !volume) {
    weight = `${weightMatch[1]}${weightMatch[2]}`;
    size = weight;
  }

  // 2. SPF extraction (e.g. SPF 50, SPF 30, SPF 50+)
  const spfMatch = lowerText.match(/\bspf\s*(\d+\+?)\b/i) || lowerText.match(/\b(\d+\+?)\s*spf\b/i);
  if (spfMatch) {
    spf = `SPF ${spfMatch[1]}`;
  }

  // 3. Key Ingredient extraction
  for (const [key, name] of Object.entries(BEAUTY_INGREDIENTS)) {
    if (lowerText.includes(key)) {
      ingredient = name;
      break;
    }
  }

  // 4. Formulation extraction
  for (const [key, form] of Object.entries(BEAUTY_FORMULATIONS)) {
    if (lowerText.includes(key)) {
      formulation = form;
      break;
    }
  }

  // 5. Shade extraction (e.g. Shade 120, Shade 220, Ivory, Fair, Beige, Nude)
  const shadeMatch = lowerText.match(/\b(?:shade\s*)?(\d{2,3})\b/i);
  if (shadeMatch && (lowerText.includes("foundation") || lowerText.includes("concealer") || lowerText.includes("powder"))) {
    shade = `Shade ${shadeMatch[1]}`;
  } else {
    const shadeWords = ["ivory", "fair", "beige", "nude", "natural", "warm nude", "classic red"];
    for (const s of shadeWords) {
      if (lowerText.includes(s)) {
        shade = s.replace(/\b\w/g, l => l.toUpperCase());
        break;
      }
    }
  }

  // 6. Skin Type extraction
  const skinMatch = lowerText.match(/\b(oily|dry|combination|sensitive)\s*(?:skin)?\b/i);
  if (skinMatch) {
    skinType = SKIN_TYPES[skinMatch[1].toLowerCase()] || null;
  }

  return {
    ...createEmptyAttributes(),
    color,
    size,
    volume,
    weight,
    variant: formulation || ingredient || null,
    spf,
    ingredient,
    formulation,
    shade,
    skinType
  };
}
