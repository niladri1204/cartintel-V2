import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const FURNITURE_COLORS: Record<string, string> = {
  walnut: "Walnut",
  oak: "Oak",
  teak: "Teak",
  mahogany: "Mahogany",
  black: "Black",
  white: "White",
  brown: "Brown",
  grey: "Grey",
  gray: "Grey",
  beige: "Beige"
};

const FURNITURE_MATERIALS: Record<string, string> = {
  "solid wood": "Solid Wood",
  "engineered wood": "Engineered Wood",
  mdf: "MDF",
  "particle board": "Particle Board",
  plywood: "Plywood",
  metal: "Metal",
  steel: "Steel",
  aluminium: "Aluminium",
  aluminum: "Aluminium",
  glass: "Glass",
  plastic: "Plastic",
  leather: "Leather",
  "faux leather": "Faux Leather",
  fabric: "Fabric",
  velvet: "Velvet",
  rattan: "Rattan",
  cane: "Cane",
  wood: "Wood"
};

/**
 * Furniture Attribute Extractor V2.
 * Extracts dimensions, material, color, seating capacity, and bed size configuration.
 */
export function extractFurnitureAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  const text = tokens.join(" ");
  const lowerText = text.toLowerCase();

  let color: string | null = null;
  let size: string | null = null;
  let dimensions: string | null = null;
  let variant: string | null = null;
  let material: string | null = null;

  // 1. Dimensions Extraction (e.g. 180 x 80 x 75 cm, L 180cm x W 80cm x H 75cm, 120cm wide, 6 ft)
  const dimMatch =
    lowerText.match(/(?:l\s*)?\d+(?:\.\d+)?\s*(?:cm|mm|m|in|ft|inch|inches)?\s*x\s*(?:w\s*)?\d+(?:\.\d+)?(?:\s*x\s*(?:h|d\s*)?\d+(?:\.\d+)?)?\s*(cm|mm|m|in|ft|inch|inches)?/i) ||
    lowerText.match(/\b\d+(?:\.\d+)?\s*(?:cm|mm|m|in|ft|inch|inches)\b/i);

  if (dimMatch) {
    dimensions = dimMatch[0].trim();
    size = dimensions;
  }

  // 2. Seating Capacity (e.g. 1 Seater, 2 Seater, 3 Seater, 6 Seater)
  const seaterMatch = lowerText.match(/\b([1-9])\s*(?:seater|seat)\b/i);
  if (seaterMatch) {
    variant = `${seaterMatch[1]} Seater`;
  }

  // 3. Bed Size Configuration (e.g. King, Queen, Single, Double, Twin)
  const bedSizeMatch = lowerText.match(/\b(king|queen|single|double|twin)\s*(?:size)?\b/i);
  if (bedSizeMatch && !variant) {
    const capitalized = bedSizeMatch[1].charAt(0).toUpperCase() + bedSizeMatch[1].slice(1).toLowerCase();
    variant = `${capitalized} Size`;
    if (!size) size = capitalized;
  }

  // 4. Material Extraction
  for (const [key, name] of Object.entries(FURNITURE_MATERIALS)) {
    if (lowerText.includes(key)) {
      material = name;
      break;
    }
  }

  // 5. Color Family Extraction
  for (const [key, name] of Object.entries(FURNITURE_COLORS)) {
    if (lowerText.includes(key)) {
      color = name;
      break;
    }
  }

  return {
    ...createEmptyAttributes(),
    color,
    size,
    dimensions,
    variant,
    material
  };
}
