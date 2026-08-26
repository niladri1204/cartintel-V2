/**
 * Footwear Size Parser & Canonical Conversion Engine.
 * Phase 4.4.1 — Footwear Intelligence
 */

export type SizeSystem = "UK" | "US" | "EU" | "CM" | "UNKNOWN";
export type FootwearGender = "men" | "women" | "unisex" | "kids" | "unknown";

export interface CanonicalFootwearSize {
  rawSize: string;
  system: SizeSystem;
  value: number;
  gender: FootwearGender;
  canonicalUkSize: number | null;
}

/**
 * Footwear Sizing Charts (UK reference baseline).
 * Men/Unisex UK -> US -> EU -> CM mapping
 */
const MEN_SIZE_MATRIX: Array<{ uk: number; us: number; eu: number; cm: number }> = [
  { uk: 5, us: 6, eu: 39, cm: 24 },
  { uk: 6, us: 7, eu: 40, cm: 25 },
  { uk: 7, us: 8, eu: 41, cm: 26 },
  { uk: 8, us: 9, eu: 42, cm: 27 },
  { uk: 8.5, us: 9.5, eu: 42.5, cm: 27.5 },
  { uk: 9, us: 10, eu: 43, cm: 28 },
  { uk: 9.5, us: 10.5, eu: 43.5, cm: 28.5 },
  { uk: 10, us: 11, eu: 44, cm: 29 },
  { uk: 11, us: 12, eu: 45, cm: 30 },
  { uk: 12, us: 13, eu: 46, cm: 31 }
];

/**
 * Women UK -> US -> EU mapping
 */
const WOMEN_SIZE_MATRIX: Array<{ uk: number; us: number; eu: number; cm: number }> = [
  { uk: 3, us: 5, eu: 36, cm: 22 },
  { uk: 4, us: 6, eu: 37, cm: 23 },
  { uk: 5, us: 7, eu: 38, cm: 24 },
  { uk: 6, us: 8, eu: 39, cm: 25 },
  { uk: 7, us: 9, eu: 40, cm: 26 },
  { uk: 8, us: 10, eu: 41, cm: 27 }
];

/**
 * Converts a size value from a given system to canonical UK size.
 */
export function convertToUkSize(system: SizeSystem, val: number, gender: FootwearGender = "unknown"): number | null {
  if (system === "UK") return val;

  const matrix = gender === "women" ? WOMEN_SIZE_MATRIX : MEN_SIZE_MATRIX;

  if (system === "US") {
    const found = matrix.find(m => Math.abs(m.us - val) < 0.25);
    return found ? found.uk : (gender === "women" ? val - 2 : val - 1);
  }

  if (system === "EU") {
    const found = matrix.find(m => Math.abs(m.eu - val) < 0.5);
    return found ? found.uk : val - 34;
  }

  if (system === "CM") {
    const found = matrix.find(m => Math.abs(m.cm - val) < 0.5);
    return found ? found.uk : null;
  }

  return null;
}

/**
 * Parses a footwear size string into a structured CanonicalFootwearSize.
 */
export function parseFootwearSize(
  sizeStr: string | null | undefined,
  genderContext?: string | null
): CanonicalFootwearSize | null {
  if (!sizeStr || !sizeStr.trim()) return null;

  const text = sizeStr.trim();
  const lower = text.toLowerCase();

  // Normalize gender
  let gender: FootwearGender = "unknown";
  if (genderContext) {
    const g = genderContext.toLowerCase();
    if (g.includes("women") || g.includes("female") || g === "girls") gender = "women";
    else if (g.includes("men") || g.includes("male") || g === "boys") gender = "men";
    else if (g.includes("unisex")) gender = "unisex";
    else if (g.includes("kids")) gender = "kids";
  }

  // Detect explicit size system prefix or suffix
  let system: SizeSystem = "UNKNOWN";
  let numVal: number | null = null;

  // UK match: e.g. "UK 9", "9 UK", "size uk 9"
  const ukMatch = lower.match(/\b(?:uk|size\s*uk)\s*(\d+(?:\.\d+)?)\b/) || lower.match(/\b(\d+(?:\.\d+)?)\s*uk\b/);
  if (ukMatch) {
    system = "UK";
    numVal = parseFloat(ukMatch[1]);
  }

  // US match: e.g. "US 10", "10 US", "size us 10"
  if (!numVal) {
    const usMatch = lower.match(/\b(?:us|size\s*us)\s*(\d+(?:\.\d+)?)\b/) || lower.match(/\b(\d+(?:\.\d+)?)\s*us\b/);
    if (usMatch) {
      system = "US";
      numVal = parseFloat(usMatch[1]);
    }
  }

  // EU match: e.g. "EU 43", "43 EU", "eur 43"
  if (!numVal) {
    const euMatch = lower.match(/\b(?:eu|eur|euro|size\s*eu)\s*(\d+(?:\.\d+)?)\b/) || lower.match(/\b(\d+(?:\.\d+)?)\s*(?:eu|eur)\b/);
    if (euMatch) {
      system = "EU";
      numVal = parseFloat(euMatch[1]);
    }
  }

  // CM / JP match: e.g. "27.5 cm", "275 mm", "cm 27.5"
  if (!numVal) {
    const cmMatch = lower.match(/\b(\d+(?:\.\d+)?)\s*cm\b/) || lower.match(/\bcm\s*(\d+(?:\.\d+)?)\b/);
    if (cmMatch) {
      system = "CM";
      numVal = parseFloat(cmMatch[1]);
    }
  }

  // Implicit numeric fallback if standalone number in standard footwear size ranges
  if (!numVal) {
    const rawNum = parseFloat(lower.replace(/[^\d.]/g, ""));
    if (!isNaN(rawNum)) {
      numVal = rawNum;
      if (rawNum >= 35 && rawNum <= 48) system = "EU";
      else if (rawNum >= 3 && rawNum <= 14) system = "UK"; // Default UK/Indian standard
    }
  }

  if (numVal === null || isNaN(numVal)) return null;

  // Convert to canonical UK size
  const canonicalUkSize = convertToUkSize(system, numVal, gender);

  return {
    rawSize: text,
    system,
    value: numVal,
    gender,
    canonicalUkSize
  };
}

/**
 * Compares two canonical footwear sizes for compatibility and equivalence.
 */
export function areFootwearSizesCompatible(
  s1: CanonicalFootwearSize | null | undefined,
  s2: CanonicalFootwearSize | null | undefined
): { isMatch: boolean; isEquivalent: boolean; reason?: string } {
  if (!s1 || !s2) {
    return { isMatch: true, isEquivalent: false, reason: "Missing size on one or both items" };
  }

  // Same system & value: exact match
  if (s1.system === s2.system && s1.value === s2.value) {
    return { isMatch: true, isEquivalent: true, reason: "Exact same size and system" };
  }

  // Canonical UK size comparison
  if (s1.canonicalUkSize !== null && s2.canonicalUkSize !== null) {
    if (Math.abs(s1.canonicalUkSize - s2.canonicalUkSize) < 0.25) {
      return { isMatch: true, isEquivalent: true, reason: `Equivalent canonical size (UK ${s1.canonicalUkSize})` };
    } else {
      return { isMatch: false, isEquivalent: false, reason: `Mismatched sizes (UK ${s1.canonicalUkSize} vs UK ${s2.canonicalUkSize})` };
    }
  }

  // Fallback raw size comparison
  if (s1.rawSize.toLowerCase() === s2.rawSize.toLowerCase()) {
    return { isMatch: true, isEquivalent: true, reason: "Raw size string match" };
  }

  return { isMatch: false, isEquivalent: false, reason: "Incompatible sizes" };
}
