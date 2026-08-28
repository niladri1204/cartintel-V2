import {
  KNOWN_BRANDS,
  BEAUTY_KEYWORDS,
  FASHION_KEYWORDS,
  ELECTRONICS_KEYWORDS,
  GROCERY_KEYWORDS,
  FURNITURE_KEYWORDS,
  BOOKS_KEYWORDS
} from "./constants";

export interface BrandResolution {
  brand: string | null;
  confidence: number;
  source:
    | "dom_structured"
    | "jsonld"
    | "breadcrumb"
    | "metadata"
    | "title"
    | "known_brand"
    | "unresolved";
  evidence: string[];
}

export interface BrandResolutionInput {
  structuredBrand?: string | null;
  jsonLdBrand?: string | null;
  breadcrumbBrand?: string | null;
  metadataBrand?: string | null;
  url?: string | null;
  title?: string | null;
  normalizedTitle?: string | null;
  tokens?: string[];
  category?: string | null;
  marketplace?: string | null;
}

const BRAND_SET = new Set(KNOWN_BRANDS.map((b) => b.toLowerCase()));

// Common multi-word brand prefixes in e-commerce
const MULTI_WORD_PREFIXES = [
  "the derma co",
  "derma co",
  "dot & key",
  "dot and key",
  "sugar cosmetics",
  "swiss beauty",
  "faces canada",
  "insight cosmetics",
  "colorbar cosmetics",
  "colorbar",
  "forest essentials",
  "kama ayurveda",
  "kay beauty",
  "typsy beauty",
  "dr. sheth's",
  "dr sheths",
  "just herbs",
  "minimalist",
  "the ordinary",
  "mamaearth",
  "plum goodness",
  "old spice",
  "urban decay",
  "bath & body works",
  "bath and body works",
  "victoria's secret",
  "victorias secret",
  "marks & spencer",
  "marks and spencer",
  "united colors of benetton",
  "u.s. polo assn.",
  "us polo assn",
  "flying machine",
  "peter england",
  "allen solly",
  "louis philippe",
  "van heusen",
  "monte carlo",
  "red tape",
  "spykar",
  "killer",
  "mufti"
];

// Words that are NOT brands even if they appear at the start of a title
const GENERIC_TITLE_PREFIXES = new Set([
  "buy", "shop", "online", "official", "original", "genuine", "authentic",
  "men", "mens", "men's", "women", "womens", "women's", "unisex", "kids", "boys", "girls",
  "best", "new", "latest", "top", "premium", "pure", "natural", "organic",
  "pack", "set", "combo", "pair", "all", "pro", "ultra", "mini", "max", "plus",
  "daily", "essential", "classic", "standard", "heavy", "light", "super",
  "deal", "offer", "sale", "discount", "special", "limited", "exclusive",
  "universal", "wireless", "bluetooth", "portable", "smart", "waterproof",
  "rechargeable", "electric", "cordless", "multi", "compatible", "durable",
  "adjustable", "foldable", "magnetic", "disposable", "reusable", "ergonomic",
  "fast", "quick", "speed", "high", "usb", "type", "hd", "4k", "led", "black", "white"
]);

// Product type / category indicator terms that follow the brand
const PRODUCT_CATEGORY_INDICATORS = new Set([
  ...BEAUTY_KEYWORDS,
  ...FASHION_KEYWORDS,
  ...ELECTRONICS_KEYWORDS,
  ...GROCERY_KEYWORDS,
  ...FURNITURE_KEYWORDS,
  ...BOOKS_KEYWORDS,
  "lipstick", "lip", "balm", "gloss", "liner", "eyeliner", "mascara", "kajal", "foundation",
  "concealer", "blush", "highlighter", "primer", "serum", "cream", "moisturizer", "sunscreen",
  "cleanser", "facewash", "face", "wash", "toner", "lotion", "shampoo", "conditioner", "oil",
  "perfume", "deodorant", "body", "mist", "scrub", "mask", "gel", "soap", "foam", "drop",
  "spray", "phone", "smartphone", "mobile", "laptop", "tablet", "watch", "smartwatch",
  "earbuds", "earphones", "headphones", "tws", "tv", "speaker", "charger", "cable", "adapter",
  "shoes", "sneakers", "boots", "sandals", "slippers", "shirt", "t-shirt", "tshirt", "polo",
  "jeans", "trousers", "pants", "dress", "kurta", "kurti", "saree", "jacket", "hoodie"
]);

export function cleanBrandString(brand: string | null | undefined): string | null {
  if (!brand) return null;
  let cleaned = brand.trim();
  cleaned = cleaned.replace(/^(?:brand|visit the|visit)\s*:?\s*/i, '').replace(/\s*store$/i, '').trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  if (cleaned.length === 0 || cleaned.length > 50) return null;
  if (GENERIC_TITLE_PREFIXES.has(cleaned.toLowerCase())) return null;
  return cleaned;
}

export function extractBrandFromUrl(urlStr: string | null | undefined): string | null {
  if (!urlStr) return null;
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    const pathname = decodeURIComponent(u.pathname).toLowerCase();

    // 1. Myntra: /category/brand/product-name/... (e.g. /eyeliner/maybelline/colossal... or /lip-balm/mars/candylicious...)
    if (host.includes("myntra.com")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 3 && parts[1] && parts[1].length > 1 && !GENERIC_TITLE_PREFIXES.has(parts[1])) {
        return parts[1].replace(/-/g, " ").trim();
      }
    }

    // 2. Generic /brand/xxx or /brands/xxx path
    const brandPathMatch = pathname.match(/\/(?:brand|brands)\/([a-z0-9-]+)/i);
    if (brandPathMatch && brandPathMatch[1] && !GENERIC_TITLE_PREFIXES.has(brandPathMatch[1])) {
      return brandPathMatch[1].replace(/-/g, " ").trim();
    }
  } catch {}
  return null;
}

function findConflictingBrandInTitle(title: string, structuredBrand: string): string | null {
  const lowerTitle = title.toLowerCase();
  for (const known of KNOWN_BRANDS) {
    const lk = known.toLowerCase();
    if (lk !== structuredBrand && lowerTitle.startsWith(lk)) {
      const nextChar = lowerTitle.charAt(lk.length);
      if (!nextChar || /\s|[-|:,]/.test(nextChar)) {
        return lk;
      }
    }
  }
  return null;
}

export function resolveBrand(input: BrandResolutionInput): BrandResolution {
  const evidence: string[] = [];
  const rawTitle = input.title || input.normalizedTitle || (input.tokens ? input.tokens.join(" ") : "");
  const isBookContext =
    input.category === "Books" ||
    (rawTitle && /\b(?:isbn|paperback|hardcover|edition|publisher|author)\b/i.test(rawTitle));

  // Tier 1: Authoritative Structured Evidence (DOM Provider)
  const structured = cleanBrandString(input.structuredBrand);
  if (structured) {
    const normalized = structured.toLowerCase();
    if (rawTitle) {
      const conflict = findConflictingBrandInTitle(rawTitle, normalized);
      if (conflict) {
        evidence.push(`Contradiction detected: DOM brand '${structured}' vs title brand '${conflict}'`);
        return {
          brand: normalized,
          confidence: 50,
          source: "dom_structured",
          evidence
        };
      }
    }
    evidence.push(`DOM structured brand: "${structured}"`);
    return {
      brand: normalized,
      confidence: 95,
      source: "dom_structured",
      evidence
    };
  }

  // Tier 2: Schema.org JSON-LD Product Evidence
  const jsonLd = cleanBrandString(input.jsonLdBrand);
  if (jsonLd) {
    const normalized = jsonLd.toLowerCase();
    if (rawTitle) {
      const conflict = findConflictingBrandInTitle(rawTitle, normalized);
      if (conflict) {
        evidence.push(`Contradiction detected: JSON-LD brand '${jsonLd}' vs title brand '${conflict}'`);
        return {
          brand: normalized,
          confidence: 50,
          source: "jsonld",
          evidence
        };
      }
    }
    evidence.push(`JSON-LD schema.org/Product brand: "${jsonLd}"`);
    return {
      brand: normalized,
      confidence: 95,
      source: "jsonld",
      evidence
    };
  }

  // Tier 3: Breadcrumb / Page Metadata / URL Evidence
  const breadcrumb = cleanBrandString(input.breadcrumbBrand);
  if (breadcrumb) {
    const normalized = breadcrumb.toLowerCase();
    evidence.push(`Breadcrumb brand: "${breadcrumb}"`);
    return {
      brand: normalized,
      confidence: 90,
      source: "breadcrumb",
      evidence
    };
  }

  const metadata = cleanBrandString(input.metadataBrand);
  if (metadata) {
    const normalized = metadata.toLowerCase();
    evidence.push(`Metadata brand: "${metadata}"`);
    return {
      brand: normalized,
      confidence: 90,
      source: "metadata",
      evidence
    };
  }

  const urlBrand = cleanBrandString(extractBrandFromUrl(input.url));
  if (urlBrand) {
    const normalized = urlBrand.toLowerCase();
    evidence.push(`URL path brand: "${urlBrand}"`);
    return {
      brand: normalized,
      confidence: 85,
      source: "metadata",
      evidence
    };
  }

  // Tier 4: Title Linguistic, Catalog, and Structural Analysis
  if (rawTitle && rawTitle.trim().length > 0) {
    const titleTrimmed = rawTitle.trim();
    const titleLower = titleTrimmed.toLowerCase();

    // 4.1 "by Brand" or "from Brand" explicit clause (Only for non-book products)
    if (!isBookContext) {
      const byMatch = titleTrimmed.match(/\b(?:by|from)\s+([A-Za-z0-9&'.\s]{2,30})/i);
      if (byMatch) {
        const extracted = byMatch[1].split(/\s+(?:with|for|and|in|on|at|from|to)\b/i)[0].trim();
        const candidateBy = cleanBrandString(extracted);
        if (candidateBy && (BRAND_SET.has(candidateBy.toLowerCase()) || !GENERIC_TITLE_PREFIXES.has(candidateBy.toLowerCase()))) {
          evidence.push(`Title explicit creator clause: "${candidateBy}"`);
          return {
            brand: candidateBy.toLowerCase(),
            confidence: 90,
            source: BRAND_SET.has(candidateBy.toLowerCase()) ? "known_brand" : "title",
            evidence
          };
        }
      }
    }

    // 4.2 Multi-word brand prefix check
    for (const prefix of MULTI_WORD_PREFIXES) {
      if (titleLower.startsWith(prefix)) {
        const nextChar = titleLower.charAt(prefix.length);
        if (!nextChar || /\s|[-|:,]/.test(nextChar)) {
          evidence.push(`Multi-word title brand prefix: "${prefix}"`);
          return {
            brand: prefix,
            confidence: 90,
            source: "title",
            evidence
          };
        }
      }
    }

    // 4.3 Static Known Brand Catalog Lookup (Preserving & for brands like H&M)
    const titleTokens = input.tokens || titleLower.split(/\s+/);
    for (const token of titleTokens) {
      const cleanToken = token.toLowerCase().replace(/[^a-z0-9'&]/gi, "");
      if (BRAND_SET.has(cleanToken)) {
        evidence.push(`Catalog lookup matched brand: "${cleanToken}"`);
        return {
          brand: cleanToken,
          confidence: 90,
          source: "known_brand",
          evidence
        };
      }
    }

    // 4.4 Explicit Separator Syntax: "Brand | Product" or "Brand - Product" or "Brand: Product"
    const sepMatch = titleTrimmed.match(/^([A-Za-z0-9&'.\s]{2,25})\s+(?:[:|–—]|-)\s+(.+)$/) ||
                     titleTrimmed.match(/^([A-Za-z0-9&'.\s]{2,25})\s*\|\s*(.+)$/);
    if (sepMatch) {
      const candidateBrand = cleanBrandString(sepMatch[1]);
      if (candidateBrand && !GENERIC_TITLE_PREFIXES.has(candidateBrand.toLowerCase())) {
        const brandWords = candidateBrand.split(/\s+/);
        if (brandWords.length <= 3) {
          evidence.push(`Title separator syntax brand: "${candidateBrand}"`);
          return {
            brand: candidateBrand.toLowerCase(),
            confidence: 85,
            source: "title",
            evidence
          };
        }
      }
    }

    // 4.5 Leading Token Title Heuristic: [Brand] [Product Descriptor / Category / Model] (Skip for Book titles)
    const tokens = input.tokens || titleTrimmed.split(/\s+/);
    if (!isBookContext && tokens.length >= 2) {
      const firstToken = tokens[0].trim();
      const firstTokenLower = firstToken.toLowerCase().replace(/[^a-z0-9&']/gi, "");
      
      if (firstTokenLower.length >= 2 && !GENERIC_TITLE_PREFIXES.has(firstTokenLower)) {
        const secondTokenLower = tokens[1]?.toLowerCase().replace(/[^a-z0-9]/gi, "") || "";
        const thirdTokenLower = tokens[2]?.toLowerCase().replace(/[^a-z0-9]/gi, "") || "";

        const hasProductIndicator =
          PRODUCT_CATEGORY_INDICATORS.has(secondTokenLower) ||
          PRODUCT_CATEGORY_INDICATORS.has(thirdTokenLower) ||
          PRODUCT_CATEGORY_INDICATORS.has(`${secondTokenLower} ${thirdTokenLower}`);

        const isCapitalized = /^[A-Z0-9&]/.test(firstToken);
        if (hasProductIndicator || isCapitalized) {
          if (secondTokenLower === "beauty" || secondTokenLower === "cosmetics" || secondTokenLower === "organics" || secondTokenLower === "naturals" || secondTokenLower === "botanicals") {
            const twoWordBrand = `${firstTokenLower} ${secondTokenLower}`;
            evidence.push(`Leading 2-word title brand: "${twoWordBrand}"`);
            return {
              brand: twoWordBrand,
              confidence: 85,
              source: "title",
              evidence
            };
          }

          evidence.push(`Leading title token brand: "${firstTokenLower}"`);
          return {
            brand: firstTokenLower,
            confidence: 80,
            source: "title",
            evidence
          };
        }
      }
    }
  }

  // Tier 5: Genuinely Unresolved
  evidence.push("No authoritative, contextual, or title brand evidence found.");
  return {
    brand: null,
    confidence: 0,
    source: "unresolved",
    evidence
  };
}

/**
 * Backward-compatible extractBrand helper.
 */
export function extractBrand(
  tokens: string[],
  context?: Partial<BrandResolutionInput>
): string | null {
  const res = resolveBrand({
    tokens,
    ...context
  });
  return res.brand;
}
