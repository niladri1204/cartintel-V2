// @ts-nocheck
import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const ELECTRONICS_COLORS = new Set([
  "black",
  "white",
  "blue",
  "red",
  "green",
  "yellow",
  "silver",
  "gold",
  "pink",
  "purple",
  "gray",
  "grey",
  "orange",
  "brown",
  "beige",
  "navy",
  "obsidian",
  "hazel",
  "porcelain",
  "titanium",
  "dark grey",
  "dark gray"
]);

const ELECTRONICS_VARIANTS = new Set([
  "pro",
  "plus",
  "ultra",
  "mini",
  "max",
  "air",
  "lite",
  "fe",
  "neo"
]);

function cleanTokenStr(str: string): string {
  return str.replace(/^[^\w]+|[^\w]+$/g, "").toLowerCase();
}

/**
 * Electronics Attribute Extractor.
 * Detects storage, RAM, color, variant, processor, and display attributes.
 */
export function extractElectronicsAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  const rawTitle = tokens.join(" ").toLowerCase();

  let ram: string | null = null;
  let storage: string | null = null;
  let color: string | null = null;
  let variant: string | null = null;
  let processor: string | null = null;
  let display: string | null = null;

  // 1. Explicit RAM extraction with context words (e.g. "12gb ram", "12 gb ram", "ram: 12gb")
  const explicitRamMatch = rawTitle.match(/(\d+\s*gb)\s*(?:ram|memory)\b/i) ||
                           rawTitle.match(/\b(?:ram|memory)\s*:?\s*(\d+\s*gb)\b/i);
  if (explicitRamMatch) {
    ram = `${(explicitRamMatch[1] || "").replace(/\s+/g, "")}`.toLowerCase();
  }

  // 2. Explicit Storage extraction with context words (e.g. "256gb storage", "256 gb rom", "internal 256gb")
  const explicitStorageMatch = rawTitle.match(/(\d+\s*(?:gb|tb))\s*(?:storage|rom|internal)\b/i) ||
                               rawTitle.match(/\b(?:storage|rom|internal)\s*:?\s*(\d+\s*(?:gb|tb))\b/i);
  if (explicitStorageMatch) {
    storage = `${(explicitStorageMatch[1] || "").replace(/\s+/g, "")}`.toLowerCase();
  }

  // 3. Dual capacity combo (e.g. "12gb+256gb", "12gb/256gb", "12gb 256gb", "12gb, 256gb")
  const comboMatch = rawTitle.match(/\b(\d+)\s*gb\s*[\/+,\s]\s*(\d+)\s*(gb|tb)\b/i);
  if (comboMatch) {
    const num1 = parseInt(comboMatch[1], 10);
    const num2 = parseInt(comboMatch[2], 10);
    const unit2 = comboMatch[3].toLowerCase();

    if (!isNaN(num1) && !isNaN(num2) && num1 < num2 && num1 <= 32 && num2 >= 32) {
      if (!ram) ram = `${num1}gb`;
      if (!storage) storage = `${num2}${unit2}`;
    }
  }


  // 4. Fallback capacity extraction for remaining capacities
  if (!storage || !ram) {
    const allCapacityMatches = Array.from(rawTitle.matchAll(/\b(\d+)\s*(gb|tb)\b/gi));
    for (const match of allCapacityMatches) {
      const num = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      const fullVal = `${num}${unit}`;

      // Skip if this capacity matches explicit RAM already identified
      if (ram && ram === fullVal && rawTitle.includes(`${fullVal} ram`)) {
        continue;
      }

      if (unit === "tb" || num >= 32) {
        if (!storage) storage = fullVal;
      } else if (num <= 24) {
        if (!ram && storage && storage !== fullVal) {
          ram = fullVal;
        } else if (!storage && !ram) {
          const hasLargerLater = allCapacityMatches.some((m) => {
            const n = parseInt(m[1], 10);
            const u = m[2].toLowerCase();
            return u === "tb" || n >= 32;
          });
          if (hasLargerLater) {
            ram = fullVal;
          } else {
            storage = fullVal;
          }
        }
      }
    }
  }

  // 5. Detect Color (clean token matching)
  for (const token of tokens) {
    const clean = cleanTokenStr(token);
    if (ELECTRONICS_COLORS.has(clean)) {
      color = clean;
      break;
    }
  }

  if (!color) {
    if (rawTitle.includes("dark grey")) color = "dark grey";
    else if (rawTitle.includes("dark gray")) color = "dark gray";
  }

  // 6. Detect Variant (clean token matching)
  for (const token of tokens) {
    const clean = cleanTokenStr(token);
    if (ELECTRONICS_VARIANTS.has(clean)) {
      variant = clean;
      break;
    }
  }

  // 7. Detect Processor
  const procMatch = rawTitle.match(/(snapdragon\s+[a-z0-9\s]+|dimensity\s+\d+|exynos\s+\d+|apple\s+a\d+(?:\s+pro)?|bionic)/i);
  if (procMatch) {
    processor = (procMatch[1] || "").trim();
  }

  // 8. Detect Display specs
  const displayMatch = rawTitle.match(/(\d+(?:\.\d+)?k\+?\s*)?(\d+hz\s*)?(amoled|oled|lcd|flex|flexible|ltps)/i);
  if (displayMatch) {
    display = displayMatch[0].trim();
  }

  return {
    ...createEmptyAttributes(),
    storage,
    ram,
    color,
    variant,
    processor,
    display
  };
}

