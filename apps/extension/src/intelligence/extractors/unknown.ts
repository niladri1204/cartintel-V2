import { type ProductAttributes } from "../attributes";
import { extractElectronicsAttributes } from "./electronics";

/**
 * Unknown/Fallback Attribute Extractor.
 * Fallbacks to electronics attribute extraction for general/unclassified titles.
 */
export function extractUnknownAttributes(tokens: string[]): ProductAttributes {
  return extractElectronicsAttributes(tokens);
}

