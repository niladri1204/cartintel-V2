import type { RawProductResult, SearchRequest } from "./types";

export function safeHostname(urlStr?: string | null): string {
  if (!urlStr) return "none";
  try {
    return new URL(urlStr).hostname;
  } catch {
    return "invalid";
  }
}

// ─── Known Merchant Domain Mappings & Product URL Rules ──────────────────────

export interface MerchantDomainRule {
  merchantPatterns: string[];
  domains: string[];
  siteFilter: string;
  tier: 1 | 2 | 3;
}

export const MERCHANT_DOMAIN_RULES: MerchantDomainRule[] = [
  // Tier 1 - Major National Marketplaces & OEM Stores
  {
    merchantPatterns: ["amazon", "amazon.in", "amazon india"],
    domains: ["amazon.in", "www.amazon.in"],
    siteFilter: "site:amazon.in",
    tier: 1,
  },
  {
    merchantPatterns: ["flipkart", "flipkart.com"],
    domains: ["flipkart.com", "www.flipkart.com"],
    siteFilter: "site:flipkart.com",
    tier: 1,
  },
  {
    merchantPatterns: ["croma", "croma.com"],
    domains: ["croma.com", "www.croma.com"],
    siteFilter: "site:croma.com",
    tier: 1,
  },
  {
    merchantPatterns: ["reliance digital", "reliancedigital", "reliancedigital.in", "reliance"],
    domains: ["reliancedigital.in", "www.reliancedigital.in"],
    siteFilter: "site:reliancedigital.in",
    tier: 1,
  },
  {
    merchantPatterns: ["vijay sales", "vijaysales", "vijaysales.com"],
    domains: ["vijaysales.com", "www.vijaysales.com"],
    siteFilter: "site:vijaysales.com",
    tier: 1,
  },
  {
    merchantPatterns: ["jiomart", "jiomart electronics", "jiomart.com"],
    domains: ["jiomart.com", "www.jiomart.com"],
    siteFilter: "site:jiomart.com",
    tier: 1,
  },
  {
    merchantPatterns: ["apple", "apple store", "apple india", "apple.com", "official apple store"],
    domains: ["apple.com", "www.apple.com"],
    siteFilter: "site:apple.com",
    tier: 1,
  },
  {
    merchantPatterns: ["samsung", "samsung shop", "samsung india", "samsung.com", "official samsung store"],
    domains: ["samsung.com", "www.samsung.com"],
    siteFilter: "site:samsung.com",
    tier: 1,
  },
  {
    merchantPatterns: ["oneplus", "oneplus store", "oneplus india", "oneplus.in"],
    domains: ["oneplus.in", "www.oneplus.in"],
    siteFilter: "site:oneplus.in",
    tier: 1,
  },

  // Tier 2 - Regional Retailers & Verified Stores
  {
    merchantPatterns: ["aptronix", "aptronixindia.com"],
    domains: ["aptronixindia.com", "www.aptronixindia.com"],
    siteFilter: "site:aptronixindia.com",
    tier: 2,
  },
  {
    merchantPatterns: ["maple store", "maple", "maplestore.in"],
    domains: ["maplestore.in", "www.maplestore.in"],
    siteFilter: "site:maplestore.in",
    tier: 2,
  },
  {
    merchantPatterns: ["unilet stores", "unilet", "uniletstores.com"],
    domains: ["uniletstores.com", "www.uniletstores.com"],
    siteFilter: "site:uniletstores.com",
    tier: 2,
  },
  {
    merchantPatterns: ["ovantica", "ovantica.com"],
    domains: ["ovantica.com", "www.ovantica.com"],
    siteFilter: "site:ovantica.com",
    tier: 2,
  },
  {
    merchantPatterns: ["cashify", "cashify.in"],
    domains: ["cashify.in", "www.cashify.in"],
    siteFilter: "site:cashify.in",
    tier: 2,
  },
  {
    merchantPatterns: ["myg", "myg.in", "myg digital"],
    domains: ["myg.in", "www.myg.in"],
    siteFilter: "site:myg.in",
    tier: 2,
  },
  {
    merchantPatterns: ["poorvika", "poorvika mobiles", "poorvika.com"],
    domains: ["poorvika.com", "www.poorvika.com"],
    siteFilter: "site:poorvika.com",
    tier: 2,
  },
  {
    merchantPatterns: ["sangeetha", "sangeetha mobiles", "sangeethamobiles.com"],
    domains: ["sangeethamobiles.com", "www.sangeethamobiles.com"],
    siteFilter: "site:sangeethamobiles.com",
    tier: 2,
  },
  {
    merchantPatterns: ["vasanth and co", "vasanth & co", "vasanth & co.", "vasanthandco.in"],
    domains: ["vasanthandco.in", "www.vasanthandco.in"],
    siteFilter: "site:vasanthandco.in",
    tier: 2,
  },
  {
    merchantPatterns: ["zepto", "zeptonow.com", "zepto.in"],
    domains: ["zeptonow.com", "www.zeptonow.com", "zepto.in"],
    siteFilter: "site:zeptonow.com",
    tier: 2,
  },
  {
    merchantPatterns: ["tata cliq", "tatacliq", "tatacliq.com", "tata cliq fashion"],
    domains: ["tatacliq.com", "www.tatacliq.com"],
    siteFilter: "site:tatacliq.com",
    tier: 2,
  },
  {
    merchantPatterns: ["myntra", "myntra.com"],
    domains: ["myntra.com", "www.myntra.com"],
    siteFilter: "site:myntra.com",
    tier: 1,
  },
  {
    merchantPatterns: ["nykaa", "nykaa.com", "nykaa fashion", "nykaafashion.com", "nykaa now", "nykaa man"],
    domains: ["nykaa.com", "nykaafashion.com", "www.nykaa.com", "www.nykaafashion.com"],
    siteFilter: "(site:nykaa.com OR site:nykaafashion.com)",
    tier: 2,
  },
  {
    merchantPatterns: ["pharmeasy", "pharmeasy.in"],
    domains: ["pharmeasy.in", "www.pharmeasy.in"],
    siteFilter: "site:pharmeasy.in",
    tier: 2,
  },
  {
    merchantPatterns: ["1mg", "tata 1mg", "1mg.com"],
    domains: ["1mg.com", "www.1mg.com"],
    siteFilter: "site:1mg.com",
    tier: 2,
  },
  {
    merchantPatterns: ["apollo247", "apollo 247", "apollo pharmacy", "apollo247.com"],
    domains: ["apollo247.com", "www.apollo247.com"],
    siteFilter: "site:apollo247.com",
    tier: 2,
  },
  {
    merchantPatterns: ["netmeds", "netmeds.com"],
    domains: ["netmeds.com", "www.netmeds.com"],
    siteFilter: "site:netmeds.com",
    tier: 2,
  },
  {
    merchantPatterns: ["firstcry", "firstcry india", "firstcry.com"],
    domains: ["firstcry.com", "www.firstcry.com"],
    siteFilter: "site:firstcry.com",
    tier: 2,
  },
  {
    merchantPatterns: ["dawaadost", "dawaadost.com"],
    domains: ["dawaadost.com", "www.dawaadost.com"],
    siteFilter: "site:dawaadost.com",
    tier: 2,
  },
  {
    merchantPatterns: ["ajio", "ajio.com", "ajio fashion"],
    domains: ["ajio.com", "www.ajio.com"],
    siteFilter: "site:ajio.com",
    tier: 1,
  },
  {
    merchantPatterns: ["adidas", "adidas.co.in", "adidas.com", "adidas india", "adidas official store"],
    domains: ["adidas.co.in", "adidas.com", "www.adidas.co.in"],
    siteFilter: "(site:adidas.co.in OR site:adidas.com)",
    tier: 2,
  },
  {
    merchantPatterns: ["puma", "puma.com", "puma india", "in.puma.com", "puma official store"],
    domains: ["puma.com", "in.puma.com", "www.puma.com"],
    siteFilter: "site:puma.com",
    tier: 2,
  },
  {
    merchantPatterns: ["nike", "nike.com", "nike india"],
    domains: ["nike.com", "www.nike.com"],
    siteFilter: "site:nike.com",
    tier: 2,
  },
  {
    merchantPatterns: ["shopsy", "shopsy by flipkart", "shopsy.in"],
    domains: ["shopsy.in", "www.shopsy.in"],
    siteFilter: "site:shopsy.in",
    tier: 2,
  },
  {
    merchantPatterns: ["superkicks", "superkicks.in"],
    domains: ["superkicks.in", "www.superkicks.in"],
    siteFilter: "site:superkicks.in",
    tier: 2,
  },
  {
    merchantPatterns: ["stockx", "stockx.com"],
    domains: ["stockx.com", "www.stockx.com"],
    siteFilter: "site:stockx.com",
    tier: 2,
  },
  {
    merchantPatterns: ["pepperfry", "pepperfry.com"],
    domains: ["pepperfry.com", "www.pepperfry.com"],
    siteFilter: "site:pepperfry.com",
    tier: 2,
  },
  {
    merchantPatterns: ["bookchor", "bookchor.com"],
    domains: ["bookchor.com", "www.bookchor.com"],
    siteFilter: "site:bookchor.com",
    tier: 2,
  },
  {
    merchantPatterns: ["innovist", "innovist.com", "bare anatomy", "chemist at play", "sunscoop"],
    domains: ["innovist.com", "www.innovist.com"],
    siteFilter: "site:innovist.com",
    tier: 2,
  },
  {
    merchantPatterns: ["beardo", "beardo.in", "beardo official store"],
    domains: ["beardo.in", "www.beardo.in"],
    siteFilter: "site:beardo.in",
    tier: 2,
  },
  {
    merchantPatterns: ["meesho", "meesho.com"],
    domains: ["meesho.com", "www.meesho.com"],
    siteFilter: "site:meesho.com",
    tier: 2,
  },
  {
    merchantPatterns: ["tira", "tira beauty", "tirabeauty.com"],
    domains: ["tirabeauty.com", "www.tirabeauty.com"],
    siteFilter: "site:tirabeauty.com",
    tier: 1,
  },
  {
    merchantPatterns: ["beminimalist.co", "minimalist", "be minimalist", "beminimalist"],
    domains: ["beminimalist.co", "www.beminimalist.co"],
    siteFilter: "site:beminimalist.co",
    tier: 2,
  },
  {
    merchantPatterns: ["the derma co", "dermaco", "thedermaco.com"],
    domains: ["thedermaco.com", "www.thedermaco.com"],
    siteFilter: "site:thedermaco.com",
    tier: 2,
  },
  {
    merchantPatterns: ["man matters", "manmatters.com"],
    domains: ["manmatters.com", "www.manmatters.com"],
    siteFilter: "site:manmatters.com",
    tier: 2,
  },
  {
    merchantPatterns: ["shoppers stop", "shoppersstop.com"],
    domains: ["shoppersstop.com", "www.shoppersstop.com"],
    siteFilter: "site:shoppersstop.com",
    tier: 2,
  },
  {
    merchantPatterns: ["recode", "recode studios", "recodefranchise.com", "recodestudios.com"],
    domains: ["recodestudios.com", "recodefranchise.com"],
    siteFilter: "(site:recodestudios.com OR site:recodefranchise.com)",
    tier: 2,
  },
  {
    merchantPatterns: ["mars cosmetics", "mars", "marscosmetics.in"],
    domains: ["marscosmetics.in", "www.marscosmetics.in"],
    siteFilter: "site:marscosmetics.in",
    tier: 2,
  },
  {
    merchantPatterns: ["purplle", "purplle.com", "purplle beauty", "purplle.com - beauty shop"],
    domains: ["purplle.com", "www.purplle.com"],
    siteFilter: "site:purplle.com",
    tier: 2,
  },
  {
    merchantPatterns: ["dot & key", "dot and key", "dotandkey.com", "dot & key skincare"],
    domains: ["dotandkey.com", "www.dotandkey.com"],
    siteFilter: "site:dotandkey.com",
    tier: 2,
  },
  {
    merchantPatterns: ["smytten", "smytten.com"],
    domains: ["smytten.com", "www.smytten.com"],
    siteFilter: "site:smytten.com",
    tier: 2,
  },
  {
    merchantPatterns: ["clickoncare", "clickoncare.com"],
    domains: ["clickoncare.com", "www.clickoncare.com"],
    siteFilter: "site:clickoncare.com",
    tier: 2,
  },
  {
    merchantPatterns: ["microless", "microless.com", "microless uae", "microless india"],
    domains: ["microless.com", "india.microless.com", "uae.microless.com"],
    siteFilter: "site:microless.com",
    tier: 2,
  },
  {
    merchantPatterns: ["desertcart", "desertcart.in", "desertcart.com", "desertcart.com.cy", "desertcart india"],
    domains: ["desertcart.in", "desertcart.com", "desertcart.com.cy"],
    siteFilter: "(site:desertcart.in OR site:desertcart.com)",
    tier: 2,
  },
];

/**
 * Extracts the registrable / root domain from a hostname.
 * Handles subdomains (india.microless.com -> microless.com, www.desertcart.in -> desertcart.in)
 * and two-part ccTLDs (.com.cy, .co.in, .com.in, .net.in, .org.in, .co.uk, .com.au).
 */
export function extractRegistrableDomain(hostname: string | null | undefined): string {
  if (!hostname) return "";
  const cleanHost = hostname.trim().toLowerCase().replace(/^www\./, "");
  const parts = cleanHost.split(".");
  if (parts.length <= 2) {
    return cleanHost;
  }

  // Known 2-part public suffixes
  const twoPartSuffixes = [
    "com.cy",
    "co.in",
    "com.in",
    "net.in",
    "org.in",
    "gen.in",
    "firm.in",
    "ind.in",
    "co.uk",
    "org.uk",
    "com.au",
    "net.au",
    "co.nz",
    "com.sg",
    "co.za",
    "com.br",
    "com.mx",
  ];

  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (twoPartSuffixes.includes(lastTwo)) {
    if (parts.length >= 3) {
      return `${parts[parts.length - 3]}.${lastTwo}`;
    }
    return cleanHost;
  }

  // Default: take last 2 parts (e.g. sub.domain.com -> domain.com)
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

/**
 * Canonical merchant name normalization and recovery.
 * For very short/ambiguous names (e.g. "co", "co.", "the co"), inspects context
 * (such as source or title) to see if a longer merchant identity (e.g. "Vasanth & Co")
 * can be safely recovered. If no context is available, returns the short name without guessing.
 */
export function normalizeMerchantName(
  merchantName?: string | null,
  contextTitle?: string | null
): string | null {
  if (!merchantName) return null;
  const raw = merchantName.trim();
  const lower = raw.toLowerCase();

  // If already full merchant name
  if (lower === "vasanth & co" || lower === "vasanth and co" || lower === "vasanth & co.") {
    return "Vasanth & Co";
  }

  // Very short ambiguous strings: "co", "co.", "the co"
  const isAmbiguousShort = /^(co\.?|the\s+co\.?|co\s+ltd\.?)$/i.test(lower);
  if (isAmbiguousShort) {
    if (contextTitle) {
      if (/\bvasanth\s*(?:&|and)\s*co\b/i.test(contextTitle)) {
        return "Vasanth & Co";
      }
    }
    return raw; // Return raw short name without fabricated domain
  }

  return raw;
}

/** Strict check for merchant domain ownership to prevent assigning OEM URLs to resellers */
export function isUrlOwnedByMerchant(
  merchantName: string | null | undefined,
  hostname: string | null | undefined
): boolean {
  if (!merchantName || !hostname) return false;
  const m = merchantName.trim().toLowerCase();
  const regDomain = extractRegistrableDomain(hostname);
  const h = hostname.trim().toLowerCase();

  // Explicit reseller / second-hand platform guard
  const isReseller =
    /\b(icrescent|imagine|unicorn|maple|tresor|cashify|budli|sahivalue|secondhand|refurbished|authori[sz]ed)\b/i.test(
      m
    );

  // 1. Apple: ONLY official Apple Store / Apple India / Apple. Resellers (e.g. iCrescent) MUST NOT receive apple.com
  if (regDomain === "apple.com" || h === "apple.com" || h.endsWith(".apple.com")) {
    if (isReseller) return false;
    return (
      m === "apple" ||
      m === "apple store" ||
      m === "apple india" ||
      m === "official apple store" ||
      m === "apple.com"
    );
  }

  // 2. Amazon
  if (regDomain === "amazon.in" || regDomain === "amazon.com") {
    return m === "amazon" || m === "amazon.in" || m === "amazon india" || m.startsWith("amazon");
  }

  // 3. Flipkart
  if (regDomain === "flipkart.com") {
    return m === "flipkart" || m === "flipkart.com" || m.startsWith("flipkart");
  }

  // 4. JioMart
  if (regDomain === "jiomart.com") {
    return m === "jiomart" || m === "jiomart electronics" || m.startsWith("jiomart");
  }

  // 5. Croma
  if (regDomain === "croma.com") {
    return m === "croma" || m === "croma.com" || m.startsWith("croma");
  }

  // 6. Reliance Digital
  if (regDomain === "reliancedigital.in") {
    return m === "reliance digital" || m === "reliancedigital" || m === "reliance";
  }

  // 7. Vijay Sales
  if (regDomain === "vijaysales.com") {
    return m === "vijay sales" || m === "vijaysales" || m.startsWith("vijay sales");
  }

  // 8. Aptronix
  if (regDomain === "aptronixindia.com") {
    return m === "aptronix" || m.includes("aptronix");
  }

  // 9. Zepto
  if (regDomain === "zeptonow.com" || regDomain === "zepto.in") {
    return m === "zepto" || m.startsWith("zepto");
  }

  // 10. MyG
  if (regDomain === "myg.in") {
    return m === "myg" || m === "myg.in";
  }

  // 11. Poorvika
  if (regDomain === "poorvika.com") {
    return m === "poorvika" || m === "poorvika mobiles";
  }

  // 12. Sangeetha
  if (regDomain === "sangeethamobiles.com") {
    return m === "sangeetha" || m === "sangeetha mobiles";
  }

  // 13. Tata CLiQ
  if (regDomain === "tatacliq.com") {
    return m.startsWith("tata cliq") || m.startsWith("tatacliq");
  }

  // 14. Myntra
  if (regDomain === "myntra.com") {
    return m.startsWith("myntra");
  }

  // 15. Nykaa / Nykaa Fashion
  if (regDomain === "nykaafashion.com" || regDomain === "nykaa.com") {
    return m.startsWith("nykaa");
  }

  // 16. AJIO
  if (regDomain === "ajio.com") {
    return m.startsWith("ajio");
  }

  // 17. Adidas
  if (regDomain === "adidas.co.in" || regDomain === "adidas.com") {
    return m.startsWith("adidas");
  }

  // 18. Puma
  if (regDomain === "puma.com") {
    return m.startsWith("puma");
  }

  // 19. Nike
  if (regDomain === "nike.com") {
    return m.startsWith("nike");
  }

  // 20. Shopsy
  if (regDomain === "shopsy.in") {
    return m.startsWith("shopsy");
  }

  // 21. Superkicks
  if (regDomain === "superkicks.in") {
    return m.startsWith("superkicks");
  }

  // 22. StockX
  if (regDomain === "stockx.com") {
    return m.startsWith("stockx");
  }

  // 23. Pepperfry
  if (regDomain === "pepperfry.com") {
    return m.startsWith("pepperfry");
  }

  // 24. Bookchor
  if (regDomain === "bookchor.com") {
    return m.startsWith("bookchor");
  }

  // 14. OnePlus
  if (regDomain === "oneplus.in") {
    if (isReseller) return false;
    return m === "oneplus" || m === "oneplus store" || m === "oneplus india";
  }

  // 15. Samsung
  if (regDomain === "samsung.com") {
    if (isReseller) return false;
    return m === "samsung" || m === "samsung shop" || m === "samsung india" || m === "official samsung store";
  }

  // 16. Google Store
  if (h === "store.google.com" || h.endsWith(".store.google.com")) {
    return m === "google store" || m === "google";
  }

  // 17. Microless (accepts microless.com, india.microless.com, uae.microless.com, etc.)
  if (regDomain === "microless.com") {
    return m === "microless" || m.includes("microless");
  }

  // 18. Desertcart (accepts desertcart.in, desertcart.com, desertcart.com.cy, etc.)
  if (regDomain === "desertcart.in" || regDomain === "desertcart.com" || regDomain === "desertcart.com.cy") {
    return m === "desertcart" || m.includes("desertcart");
  }

  // 19. Vasanth & Co
  if (regDomain === "vasanthandco.in") {
    return m.includes("vasanth") || m === "vasanth & co" || m === "vasanth and co";
  }

  // Ambiguous short merchant names (e.g. "co", "co.") MUST NEVER match arbitrary domains
  if (/^(co\.?|the\s+co\.?)$/i.test(m)) {
    return false;
  }

  // General fallback: if merchantName contains the domain (e.g. desertcart.in)
  if (m.includes(".")) {
    const cleanDomain = m.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    return regDomain === cleanDomain || h === cleanDomain || h.endsWith(`.${cleanDomain}`);
  }

  // Check matching store slug using registrable domain
  const domainParts = regDomain.split(".");
  const domainSlug = domainParts[0];
  const merchantSlug = m.replace(/[^a-z0-9]/g, "");
  if (
    domainSlug &&
    domainSlug.length >= 4 &&
    merchantSlug.length >= 4 &&
    domainSlug === merchantSlug
  ) {
    return true;
  }

  return false;
}

/** Finds the domain rule for a merchant name */
export function findMerchantDomainRule(merchantName: string | null | undefined): MerchantDomainRule | null {
  if (!merchantName) return null;
  const norm = merchantName.trim().toLowerCase();

  // Guard against short ambiguous merchant names (e.g. "co", "co.", "the co")
  if (/^(co\.?|the\s+co\.?)$/i.test(norm)) {
    return null;
  }

  // Strip common merchant suffixes: " - Beauty Shop", " - MNow", " - Seller", " - Purplle Beauty", etc.
  const cleanNorm = norm.split(/\s*[-–—|]\s*/)[0].trim();

  for (const rule of MERCHANT_DOMAIN_RULES) {
    for (const pattern of rule.merchantPatterns) {
      if (
        norm === pattern ||
        cleanNorm === pattern ||
        norm.startsWith(`${pattern} `) ||
        norm.endsWith(` ${pattern}`) ||
        cleanNorm.startsWith(`${pattern} `) ||
        norm.includes(pattern) ||
        cleanNorm.includes(pattern)
      ) {
        return rule;
      }
    }
  }

  // Fallback 1: If merchantName or cleanNorm is/contains a domain (e.g. purplle.com, clickoncare.com, meesho.com, ovantica.com)
  const domainMatch = norm.match(/\b([a-z0-9-]+\.(?:com|in|co\.in|org|net))\b/i);
  if (domainMatch) {
    const cleanDomain = domainMatch[1].toLowerCase();
    return {
      merchantPatterns: [cleanDomain],
      domains: [cleanDomain, `www.${cleanDomain}`],
      siteFilter: `site:${cleanDomain}`,
      tier: 2,
    };
  }

  // For unknown merchants: Do NOT fabricate domains. Return null.
  return null;
}

// ─── Rejection of Non-Product Pages ──────────────────────────────────────────

const REJECTED_PATH_PATTERNS: RegExp[] = [
  /^\/?$/, // homepage root
  /\/search\b/i,
  /\/s\b/i,
  /\/all-categories\b/i,
  /\/category\b/i,
  /\/categories\b/i,
  /\/collection\b/i,
  /\/collections\b/i,
  /\/browse\b/i,
  /\/stores\b/i,
  /\/brand\b/i,
  /\/product-reviews\b/i,
  /\/reviews\b/i,
  /\/cart\b/i,
  /\/checkout\b/i,
  /\/help\b/i,
  /\/unboxed\b/i, // blog/unboxing articles
  /\/blog\b/i,
  /\/news\b/i,
];

const REJECTED_TITLE_PATTERNS: RegExp[] = [
  /\bsearch results\b/i,
  /\ball categories\b/i,
  /\bcategory:\b/i,
  /\bcustomer reviews\b/i,
  /\bproduct reviews\b/i,
  /\buser guide\b/i,
  /\buser manual\b/i,
  /\bannounced\b/i,
  /\bfirst look\b/i,
];

const ACCESSORY_PATTERNS: RegExp[] = [
  /\bcase\b/i,
  /\bcover\b/i,
  /\bback cover\b/i,
  /\btempered glass\b/i,
  /\bscreen protector\b/i,
  /\bscreen guard\b/i,
  /\bbattery replacement\b/i,
  /\breplacement battery\b/i,
  /\bdisplay replacement\b/i,
  /\blcd screen\b/i,
  /\bhousing panel\b/i,
  /\bmotherboard\b/i,
  /\bcharger\b/i,
  /\bcharging cable\b/i,
];

export function isNonProductUrl(urlStr: string, title?: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();

    // Provider / search infrastructure hosts are NEVER valid product URLs
    if (
      host === "google.com" ||
      host.endsWith(".google.com") ||
      host === "google.co.in" ||
      host.endsWith(".google.co.in") ||
      host === "serpapi.com" ||
      host.endsWith(".serpapi.com") ||
      host === "serper.dev" ||
      host.endsWith(".serper.dev") ||
      host === "googleadservices.com" ||
      host.endsWith(".googleadservices.com")
    ) {
      // Except store.google.com
      if (host !== "store.google.com" && host !== "store.google.co.in") {
        return true;
      }
    }

    const pathname = u.pathname.toLowerCase();

    for (const pat of REJECTED_PATH_PATTERNS) {
      if (pat.test(pathname)) return true;
    }

    if (title) {
      for (const pat of REJECTED_TITLE_PATTERNS) {
        if (pat.test(title)) return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

// ─── Extract Storage & RAM from Strings ───────────────────────────────────────

export function extractStorageToken(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\b(32|64|128|256|512|1024)\s*(?:gb|tb)\b/i);
  return m ? m[0].toLowerCase().replace(/\s+/g, "") : null;
}

export function extractRamToken(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\b(2|3|4|6|8|12|16)\s*gb\s*ram\b/i) || text.match(/\b(2|3|4|6|8|12|16)\s*gb\b/i);
  return m ? m[0].toLowerCase().replace(/\s+/g, "") : null;
}

const ORGANIC_FILLER_WORDS = new Set([
  "buy", "online", "india", "price", "reviews", "review", "shop", "at", "for", "with", "in", "and", "the", "a", "an", "on", "official", "store", "sale", "discount", "order", "best", "free", "shipping", "delivery", "pack", "of", "to", "from", "by", "original", "item", "pdp",
  // Common merchant branding in SEO titles
  "amazon", "flipkart", "myntra", "nykaa", "purplle", "tira", "croma", "reliancedigital", "reliance", "tatacliq", "ajio", "meesho", "firstcry", "zepto", "blinkit", "bigbasket", "pharmeasy", "1mg", "apollo247", "netmeds", "innovist", "beardo", "shoppers", "stop"
]);

const INCOMPATIBLE_PRODUCT_TYPE_PAIRS: [RegExp, RegExp][] = [
  [/\b(cleanser|face\s*wash|facewash)\b/i, /\b(moisturizer|lotion|sunscreen|serum|toner|cream)\b/i],
  [/\b(sunscreen|sunblock)\b/i, /\b(cleanser|face\s*wash|serum|toner|scrub)\b/i],
  [/\b(eyeliner|kajal|kohl)\b/i, /\b(lipstick|lip\s*gloss|foundation|mascara|blush)\b/i],
  [/\b(lipstick|lip\s*balm|lip\s*tint)\b/i, /\b(eyeliner|kajal|foundation|mascara|shampoo)\b/i],
  [/\b(shampoo)\b/i, /\b(conditioner|hair\s*oil|face\s*wash)\b/i],
  [/\b(phone|smartphone)\b/i, /\b(tablet|laptop|smartwatch|earbuds|case|cover)\b/i],
];

export function normalizeTitleForOrganicMatch(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    // Normalize units with space: "500 ml" -> "500ml", "100 g" -> "100g", "6 gb" -> "6gb"
    .replace(/\b(\d+(?:\.\d+)?)\s*(ml|l|g|kg|oz|fl\s*oz|gb|tb|mah|w|inch|inches|cm|mm|m)\b/gi, "$1$2")
    // Normalize SPF with + signs: "spf 50+" / "spf 50 +" / "spf50" -> "spf 50"
    .replace(/\bspf\s*(\d+)\+*/gi, "spf $1 ")
    // Normalize PA ratings like "pa++++" / "pa+++" -> "pa"
    .replace(/\bpa\+{2,}\b/gi, "pa")
    // Normalize percentages like "2 %" -> "2%"
    .replace(/\b(\d+(?:\.\d+)?)\s*%/g, "$1%")
    // Replace punctuation and symbols (&, +, /, -, comma, brackets) with space
    .replace(/[&+/,\-–—|():;[\]{}'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Match Organic Result to Shopping Offer ──────────────────────────────────

export function matchOrganicResultToOffer(
  offer: RawProductResult,
  organicItem: { title: string; link: string; snippet?: string }
): boolean {
  if (!organicItem.link || !organicItem.title) return false;

  // 1. Hostname validation
  let organicHost = "";
  try {
    organicHost = new URL(organicItem.link).hostname.toLowerCase();
  } catch {
    return false;
  }

  // 1. Merchant ownership validation (strict domain ownership, preventing reseller URL pollution)
  const rawMerchant = offer.source || offer.marketplace;
  const merchant = (rawMerchant ? normalizeMerchantName(rawMerchant, offer.title) : null) || rawMerchant;
  if (!isUrlOwnedByMerchant(merchant, organicHost)) {
    return false;
  }

  // 2. Reject search/category/article pages
  if (isNonProductUrl(organicItem.link, organicItem.title)) return false;

  // 3. Reject accessories / replacement parts
  for (const pat of ACCESSORY_PATTERNS) {
    if (pat.test(organicItem.title) && !offer.title.toLowerCase().includes(pat.source.replace(/\\b/g, ""))) {
      return false;
    }
  }

  const offerTitle = (offer.title || "").toLowerCase();
  const orgTitle = organicItem.title.toLowerCase();

  // 4. Incompatible product type check (e.g. Cleanser vs Moisturizer, Eyeliner vs Lipstick)
  for (const [patA, patB] of INCOMPATIBLE_PRODUCT_TYPE_PAIRS) {
    if (patA.test(offerTitle) && !patB.test(offerTitle) && patB.test(orgTitle) && !patA.test(orgTitle)) {
      return false;
    }
    if (patB.test(offerTitle) && !patA.test(offerTitle) && patA.test(orgTitle) && !patB.test(orgTitle)) {
      return false;
    }
  }

  // 5. Device model compatibility for Electronics/Phones (e.g. A17 vs M17, iPhone 16 vs 15, S24 vs S23)
  const deviceModelMatch =
    offerTitle.match(/\b(galaxy\s*[a-z]\d+|iphone\s*\d+[a-z]*|pixel\s*\d+[a-z]*|[a-z]\d{2,3}[a-z]?)\b/i);

  if (deviceModelMatch) {
    const modelCode = deviceModelMatch[0]
      .toLowerCase()
      .replace(/\s+/g, "");
    const normOrgNoSpace = normalizeTitleForOrganicMatch(orgTitle).replace(/\s+/g, "");
    if (!normOrgNoSpace.includes(modelCode)) {
      return false;
    }
  }

  // 6. Brand and Token Overlap Validation
  const normOffer = normalizeTitleForOrganicMatch(offerTitle);
  const normOrg = normalizeTitleForOrganicMatch(orgTitle);

  const offerWords = normOffer.split(" ").filter(w => w.length >= 2 && !ORGANIC_FILLER_WORDS.has(w));
  const orgWords = new Set(normOrg.split(" ").filter(w => w.length >= 2 && !ORGANIC_FILLER_WORDS.has(w)));

  if (offerWords.length === 0) return false;

  // Check first non-generic token as brand anchor if it's distinctive (length >= 3 and not generic gender/descriptor)
  const genericPrefixes = new Set(["men", "women", "kids", "boys", "girls", "unisex", "combo", "pack", "mini", "set", "new", "super", "gentle", "daily"]);
  const brandAnchor = offerWords.find(w => !genericPrefixes.has(w));
  if (brandAnchor && brandAnchor.length >= 3) {
    // If brand anchor is present, verify it is in the organic result title or hostname
    if (!orgWords.has(brandAnchor) && !normOrg.includes(brandAnchor) && !organicHost.includes(brandAnchor)) {
      return false;
    }
  }

  // Token overlap check
  const matchingTokens = offerWords.filter(t => orgWords.has(t) || normOrg.includes(t));
  const matchRatio = matchingTokens.length / offerWords.length;

  if (offerWords.length <= 2) {
    if (matchingTokens.length < offerWords.length) return false;
  } else if (offerWords.length <= 4) {
    if (matchingTokens.length < 2) return false;
  } else {
    if (matchingTokens.length < 2 && matchRatio < 0.4) return false;
  }

  // 7. Storage conflict check
  const offerStorage = extractStorageToken(offerTitle);
  const orgStorage = extractStorageToken(orgTitle);
  if (offerStorage && orgStorage && offerStorage !== orgStorage) {
    return false;
  }

  // 8. RAM conflict check
  const offerRam = extractRamToken(offerTitle);
  const orgRam = extractRamToken(orgTitle);
  if (offerRam && orgRam && offerRam !== orgRam) {
    return false;
  }

  return true;
}

// ─── Direct Merchant URL Resolver with Cache & API Budget ────────────────────

export interface OrganicSearchResultItem {
  title: string;
  link: string;
  snippet?: string;
}

export class DirectMerchantUrlResolver {
  // In-memory resolution cache (TTL: 10 minutes)
  private cache = new Map<string, { url: string; timestamp: number }>();
  private readonly TTL_MS = 10 * 60 * 1000;

  private buildCacheKey(searchRequest: SearchRequest, merchant: string): string {
    const brand = (searchRequest.brand || "").trim().toLowerCase();
    const model = (searchRequest.model || searchRequest.normalizedTitle || "").trim().toLowerCase();
    const storage = (searchRequest.storage || "").trim().toLowerCase();
    const ram = (searchRequest.ram || "").trim().toLowerCase();
    const m = merchant.trim().toLowerCase();
    return `${brand}|${model}|${storage}|${ram}|${m}`;
  }

  private getCachedUrl(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.url;
  }

  private setCachedUrl(key: string, url: string): void {
    this.cache.set(key, { url, timestamp: Date.now() });
  }

  /**
   * Enriches raw shopping results by resolving direct merchant product URLs
   * using at most ONE targeted organic search for missing high-priority merchant URLs.
   *
   * NEVER alters the number of shopping results.
   * NEVER returns Google Shopping / search URLs.
   */
  async resolveMissingMerchantUrls(
    shoppingResults: RawProductResult[],
    searchRequest: SearchRequest,
    apiKey?: string,
    fetchOverride?: (url: string, init?: RequestInit) => Promise<Response>
  ): Promise<RawProductResult[]> {
    if (!shoppingResults || shoppingResults.length === 0) {
      return shoppingResults;
    }

    const effectiveFetch = fetchOverride || globalThis.fetch;

    // Step 1: Check cache for unresolved items
    const unresolvedRules = new Map<string, MerchantDomainRule>();

    for (const item of shoppingResults) {
      const rawMerchant = item.source || item.marketplace;
      if (!rawMerchant) continue;

      const merchant = normalizeMerchantName(rawMerchant, item.title) || rawMerchant;

      // If already has a valid direct URL, preserve it
      if (item.url && item.url.length > 0) {
        continue;
      }

      // Check in-memory cache
      const cacheKey = this.buildCacheKey(searchRequest, merchant);
      const cached = this.getCachedUrl(cacheKey);
      if (cached) {
        item.url = cached;
        continue;
      }

      // Identify merchant rule for organic query construction
      const rule = findMerchantDomainRule(merchant);
      if (rule && (rule.tier === 1 || rule.tier === 2)) {
        unresolvedRules.set(rule.siteFilter, rule);
      }
    }

    // Step 2: If no unresolved high-priority merchants or no API key, return immediately (0 API requests)
    if (unresolvedRules.size === 0 || !apiKey) {
      for (const item of shoppingResults) {
        const rawMerchant = item.source || item.marketplace || "unknown";
        const merchant = normalizeMerchantName(rawMerchant, item.title) || rawMerchant;
        if (item.url) {
          try {
            console.log(`[MerchantURL] merchant=${merchant} resolved=true hostname=${new URL(item.url).hostname}`);
          } catch {
            console.log(`[MerchantURL] merchant=${merchant} resolved=true`);
          }
        } else {
          item.url = "";
          console.log(`[MerchantURL] merchant=${merchant} resolved=false`);
        }
      }
      return shoppingResults;
    }

    // Step 3: Construct targeted parallel organic resolution search queries (max 3 queries, up to 4 domains per query)
    const rawQuery = [
      searchRequest.brand,
      searchRequest.model || searchRequest.normalizedTitle,
      searchRequest.storage,
      searchRequest.ram,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    // Clean trailing category labels that bloat the search string
    const baseQuery = rawQuery
      .replace(/\s+beauty\s*&\s*personal\s*care\b/i, "")
      .replace(/\s+electronics\b/i, "")
      .replace(/\s+fashion\b/i, "")
      .trim();

    const allDomainFilters = Array.from(
      new Set(
        Array.from(unresolvedRules.values()).map(r => r.domains[0])
      )
    );

    // Chunk domain filters into targeted groups (max 4 domains per query, max 3 parallel queries)
    const CHUNK_SIZE = 4;
    const domainChunks: string[][] = [];
    for (let i = 0; i < allDomainFilters.length && domainChunks.length < 3; i += CHUNK_SIZE) {
      domainChunks.push(allDomainFilters.slice(i, i + CHUNK_SIZE));
    }

    const organicPromises = domainChunks.map(async (chunk, idx) => {
      const organicQuery = `${baseQuery} (${chunk.join(" OR ")})`;
      console.log(`[MerchantURLResolver] Executing parallel organic query ${idx + 1}/${domainChunks.length}: "${organicQuery}"`);
      try {
        const response = await effectiveFetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: organicQuery,
            gl: "in",
            hl: "en",
            num: 20,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as { organic?: OrganicSearchResultItem[] };
          return data.organic || [];
        } else {
          console.warn(`[MerchantURLResolver] Parallel query ${idx + 1} returned status ${response.status}. Skipping resolution.`);
          return [];
        }
      } catch (err) {
        console.warn(`[MerchantURLResolver] Parallel query ${idx + 1} failed or timed out:`, err);
        return [];
      }
    });

    const chunkResults = await Promise.all(organicPromises);
    let organicResults: OrganicSearchResultItem[] = chunkResults.flat();
    console.log(`[MerchantURLResolver] Received ${organicResults.length} total organic candidates across ${domainChunks.length} parallel queries.`);

    // Step 4: Match organic results to unresolved shopping offers
    for (const item of shoppingResults) {
      const rawMerchant = item.source || item.marketplace;
      const merchant = (rawMerchant ? normalizeMerchantName(rawMerchant, item.title) : null) || rawMerchant || "unknown";
      if (item.url && item.url.length > 0) {
        try {
          console.log(`[MerchantURL] merchant=${merchant} resolved=true hostname=${new URL(item.url).hostname}`);
        } catch {
          console.log(`[MerchantURL] merchant=${merchant} resolved=true`);
        }
        continue;
      }

      let matchedUrl: string | null = null;

      for (const org of organicResults) {
        if (matchOrganicResultToOffer(item, org)) {
          matchedUrl = org.link;
          break;
        }
      }

      if (matchedUrl) {
        item.url = matchedUrl;
        if (merchant) {
          const cacheKey = this.buildCacheKey(searchRequest, merchant);
          this.setCachedUrl(cacheKey, matchedUrl);
        }
        try {
          console.log(`[MerchantURL] merchant=${merchant} resolved=true hostname=${new URL(matchedUrl).hostname}`);
        } catch {
          console.log(`[MerchantURL] merchant=${merchant} resolved=true`);
        }
      } else {
        item.url = "";
        console.log(`[MerchantURL] merchant=${merchant} resolved=false`);
      }
    }

    return shoppingResults;
  }
}

export const directMerchantUrlResolver = new DirectMerchantUrlResolver();
