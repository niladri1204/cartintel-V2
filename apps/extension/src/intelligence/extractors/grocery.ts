import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const GROCERY_FLAVORS: Record<string, string> = {
  "magic masala": "Magic Masala",
  masala: "Masala",
  classic: "Classic",
  salted: "Salted",
  "cream & onion": "Cream & Onion",
  "sour cream": "Sour Cream",
  chocolate: "Chocolate",
  vanilla: "Vanilla",
  strawberry: "Strawberry",
  mango: "Mango",
  original: "Original"
};

/**
 * Grocery Attribute Extractor V2.
 * Extracts standardized weight/volume, pack count, flavor, and sugar formulation.
 */
export function extractGroceryAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  const text = tokens.join(" ");
  const lowerText = text.toLowerCase();

  let size: string | null = null;
  let weight: string | null = null;
  let volume: string | null = null;
  let packCountStr: string | null = null;
  let flavor: string | null = null;
  let formulation: string | null = null;

  // 1. Weight / Volume extraction (e.g. 500g, 1kg, 2l, 500ml, 250g)
  const weightMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\s*(g|kg)\b/i);
  if (weightMatch) {
    weight = `${weightMatch[1]}${weightMatch[2].toLowerCase()}`;
    size = weight;
  }

  const volMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
  if (volMatch && !weight) {
    volume = `${volMatch[1]}${volMatch[2].toLowerCase()}`;
    size = volume;
  }

  // 2. Pack Count detection (e.g. Pack of 6, 6 x 500ml, x6, pack of 2)
  const packMatch =
    lowerText.match(/\bpack\s*of\s*(\d+)\b/i) ||
    lowerText.match(/\b(\d+)\s*x\s*\d+\s*(?:g|kg|ml|l)\b/i) ||
    lowerText.match(/\bx(\d+)\b/i);

  if (packMatch && packMatch[1] !== "1") {
    packCountStr = `pack of ${packMatch[1]}`;
  }

  // 3. Flavor extraction
  for (const [key, name] of Object.entries(GROCERY_FLAVORS)) {
    if (lowerText.includes(key)) {
      flavor = name;
      break;
    }
  }

  // 4. Formulation / Sugar tag extraction (Zero Sugar, Sugar Free, Diet, Regular)
  if (lowerText.includes("zero sugar") || lowerText.includes("no sugar")) {
    formulation = "Zero Sugar";
  } else if (lowerText.includes("sugar free") || lowerText.includes("sugar-free")) {
    formulation = "Sugar Free";
  } else if (lowerText.includes("diet")) {
    formulation = "Diet";
  } else if (lowerText.includes("regular")) {
    formulation = "Regular";
  }

  return {
    ...createEmptyAttributes(),
    size,
    weight,
    volume,
    packCount: packCountStr,
    flavor,
    formulation,
    variant: flavor || formulation || packCountStr || null
  };
}
