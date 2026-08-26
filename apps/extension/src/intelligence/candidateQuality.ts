import type { ProductIntelligence } from "./types";

export type CandidateQualityStatus =
  | "product"
  | "accessory"
  | "replacement_part"
  | "bundle"
  | "unknown";

export interface CandidateQualityResult {
  status: CandidateQualityStatus;
  isEligibleProduct: boolean;
  reasons: string[];
}

/**
 * Normalizes input text for quality classification
 */
function normalizeText(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isReplacementPartText(text: string): boolean {
  const normalized = text.toLowerCase();

  if (
    /\bbattery\s+for\b/.test(normalized) ||
    /\breplacement\s+battery\b/.test(normalized) ||
    /\bbattery\s+replacement\b/.test(normalized)
  ) {
    return true;
  }

  if (
    /\b(?:lcd|screen|display)\s+(?:for|replacement)\b/.test(normalized) ||
    /\b(?:replacement|assembly)\s+(?:screen|display|lcd)\b/.test(normalized)
  ) {
    return true;
  }

  // Standalone battery should be rejected unless clearly part of the main
  // product specification/bundle context.
  if (
    /\bbattery\b/.test(normalized) &&
    !/\b(?:battery\s+life|battery\s+capacity|battery\s+backup|battery\s+\d+|\d+\s*mah|\d+\s*wh|\d+\s*w\s+charging|\d+mah|\d+wh)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Classifies the quality of a candidate offer based on its title and categories.
 * Restricts accessories and replacement parts from polluting the candidate pool.
 */
export function classifyCandidateQuality(
  product: ProductIntelligence
): CandidateQualityResult {
  const reasons: string[] = [];

  const originalTitle = normalizeText(product.originalTitle);
  const normalizedTitle = normalizeText(product.normalizedTitle);
  const productType = normalizeText(product.productType);
  const category = normalizeText(product.category);

  // Combine fields for searching indicators
  const texts = [originalTitle, normalizedTitle, productType, category].filter(Boolean);

  const hasTerm = (terms: string[]): string | null => {
    for (const text of texts) {
      for (const term of terms) {
        const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        if (regex.test(text)) {
          return term;
        }
      }
    }
    return null;
  };

  // 1. Check BUNDLE first (e.g. "OnePlus 15R + Case" or "Phone (with charger)" is eligible)
  const bundleTerms = [
    "combo",
    "bundle",
    "kit",
    "pack",
    "with case",
    "with charger",
    "with cover",
    "with screen protector",
    "with cable",
    "cable included",
    "charger included",
    "includes charger",
    "includes cable",
  ];
  const matchedBundle = hasTerm(bundleTerms);
  if (matchedBundle) {
    reasons.push(`Detected bundle indicator: "${matchedBundle}"`);
    return {
      status: "bundle",
      isEligibleProduct: true,
      reasons
    };
  }

  // 2. Check REPLACEMENT PART terms
  const replacementTerms = [
    "replacement battery",
    "battery replacement",
    "battery for",
    "replacement screen",
    "replacement display",
    "screen replacement",
    "display replacement",
    "lcd screen",
    "lcd display",
    "display panel",
    "screen assembly",
    "screen for",
    "display for",
    "lcd for",
    "back glass replacement",
    "camera module",
    "charging port replacement",
    "housing",
    "full body housing",
    "body housing",
    "housing panel",
    "middle frame",
    "chassis",
    "back panel",
    "back door",
    "body panel",
    "spare",
    "spares",
    "spare part",
    "spare parts",
    "cellspare",
    "folder",
    "combo folder",
    "display combo",
    "charging flex",
    "main flex",
    "camera glass",
    "sub board",
    "fingerprint sensor replacement",
  ];
  const merchantName = (product.metadata?.marketplace || product.metadata?.hostname || (product as any).source || "").toLowerCase();
  const isSpareMerchant =
    merchantName.includes("cellspare") ||
    merchantName.includes("maxbhi") ||
    merchantName.includes("sparecare") ||
    merchantName.includes("spareswale");

  const matchedReplacement = hasTerm(replacementTerms);
  if (matchedReplacement || isSpareMerchant || texts.some(t => isReplacementPartText(t))) {
    reasons.push(`Detected replacement part indicator: "${matchedReplacement || (isSpareMerchant ? 'spare merchant' : 'replacement text match')}"`);
    return {
      status: "replacement_part",
      isEligibleProduct: false,
      reasons
    };
  }

  // 3. Check BOOKS / GUIDES / MANUALS terms
  const manualOrBookTerms = [
    "user guide",
    "user manual",
    "users guide",
    "users manual",
    "instruction manual",
    "tips & tricks",
    "tips and tricks",
    "for beginners",
    "beginners guide",
    "paperback",
    "hardcover",
    "kindle edition",
    "ebook",
    "handbook",
    "step by step guide",
  ];
  const matchedManual = hasTerm(manualOrBookTerms);
  if (matchedManual) {
    reasons.push(`Detected guide/manual indicator: "${matchedManual}"`);
    return {
      status: "accessory",
      isEligibleProduct: false,
      reasons
    };
  }

  // 4. Check ACCESSORY compatibility patterns (e.g. "Compatible for Google Pixel...", "Hard Back")
  if (
    /\b(?:compatible\s+for|designed\s+for|suitable\s+for|fits\s+for|made\s+for|customized\s+for)\b/i.test(originalTitle) ||
    /\b(?:hard|soft|frosted|translucent|matte|leather|silicone|tpu)\s+back\b/i.test(originalTitle)
  ) {
    reasons.push("Detected accessory compatibility pattern in title");
    return {
      status: "accessory",
      isEligibleProduct: false,
      reasons
    };
  }

  // 5. Check ACCESSORY terms
  const accessoryTerms = [
    "case",
    "cover",
    "phone cover",
    "mobile cover",
    "back cover",
    "bumper",
    "flip cover",
    "wallet case",
    "kickstand case",
    "armor case",
    "magnetic case",
    "holster",
    "hard back",
    "soft back",
    "frosted back",
    "translucent back",
    "screen protector",
    "tempered glass",
    "screen guard",
    "screen film",
    "hydrogel film",
    "lens protector",
    "camera protector",
    "camera ring",
    "charger",
    "charging cable",
    "charging adapter",
    "adapter",
    "cable",
    "phone holder",
    "car mount",
    "ring holder",
    "pop socket",
    "laptop sleeve",
    "keyboard cover",
    "mouse pad",
    "skin",
    "skins",
    "wrap",
    "wraps",
    "skins & wraps",
    "decal",
    "sticker",
    "smart watch",
    "smartwatch",
    "watch for",
    "watch strap",
    "strap",
    "band for",
    "earphone",
    "earphones",
    "headphone",
    "headphones",
    "headset",
    "neckband",
    "earbuds",
    "tws",
    "in-ear",
    "in ear",
    "हेडफ़ोन",
    "इयरफ़ोन",
    "कवर"
  ];
  const matchedAccessory = hasTerm(accessoryTerms);
  if (matchedAccessory) {
    reasons.push(`Detected accessory indicator: "${matchedAccessory}"`);
    return {
      status: "accessory",
      isEligibleProduct: false,
      reasons
    };
  }

  // Check if everything is completely empty
  if (texts.length === 0) {
    return {
      status: "unknown",
      isEligibleProduct: false,
      reasons: ["No product descriptive fields available"]
    };
  }

  // Normal eligible product
  return {
    status: "product",
    isEligibleProduct: true,
    reasons: []
  };
}
