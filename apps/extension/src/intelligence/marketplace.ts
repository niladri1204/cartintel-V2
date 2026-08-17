/**
 * Marketplace & Merchant Domain Normalizer for CartIntel.
 * Extracts the true merchant/store name from product landing URLs or provider source strings,
 * ensuring "Google" or "Google Shopping" is never displayed as the merchant.
 */

const KNOWN_MARKETPLACES: Record<string, string> = {
  "amazon": "Amazon",
  "flipkart": "Flipkart",
  "croma": "Croma",
  "reliancedigital": "Reliance Digital",
  "reliance digital": "Reliance Digital",
  "vijaysales": "Vijay Sales",
  "vijay sales": "Vijay Sales",
  "myntra": "Myntra",
  "aptronix": "Aptronix",
  "sangeethamobiles": "Sangeetha Mobiles",
  "sangeetha mobiles": "Sangeetha Mobiles",
  "dotcomstores": "Dotcom Stores",
  "dotcom stores": "Dotcom Stores",
  "uniletstores": "Unilet Stores",
  "unilet stores": "Unilet Stores",
  "poorvika": "Poorvika",
  "tatacliq": "Tata CLiQ",
  "samsung": "Samsung Store",
  "apple": "Apple Store",
  "oneplus": "OnePlus Store",
  "myg": "MyG",
  "easyphones": "EasyPhones",
  "easy phones": "EasyPhones",
  "addmecart": "Addmecart",
  "desertcart": "Desertcart",
  "ovantica": "Ovantica"
};

function formatMarketplaceString(raw: string): string {
  let text = raw.trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    text = text.replace(/%20/g, " ");
  }

  text = text.replace(/%20/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const lower = text.toLowerCase();
  if (KNOWN_MARKETPLACES[lower]) {
    return KNOWN_MARKETPLACES[lower];
  }

  return text
    .split(/\s+/)
    .map(word => {
      const wLower = word.toLowerCase();
      if (KNOWN_MARKETPLACES[wLower]) {
        return KNOWN_MARKETPLACES[wLower];
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function normalizeMarketplaceName(
  source?: string | null,
  url?: string | null,
  hostname?: string | null
): string {
  // 1. Try deriving merchant name from direct URL or hostname
  const targetUrl = url || (hostname ? `https://${hostname}` : null);

  if (targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

      for (const [key, val] of Object.entries(KNOWN_MARKETPLACES)) {
        if (!key.includes(" ") && host.includes(key)) {
          return val;
        }
      }

      // If domain is NOT google.com, clean domain name into capitalized Title Case
      if (!host.includes("google.")) {
        const parts = host.split(".");
        const mainDomain = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        return formatMarketplaceString(mainDomain);
      }
    } catch {
      // Fall through to source string check
    }
  }

  // 2. Try clean source string if provided and NOT Google
  if (source && source.trim().length > 0) {
    const formatted = formatMarketplaceString(source);
    const lower = formatted.toLowerCase();
    if (!lower.includes("google") && lower !== "google shopping") {
      return formatted;
    }
  }

  // 3. Fallback when merchant is genuinely unidentifiable (NEVER label as "Google")
  return "Unknown seller/site";
}
