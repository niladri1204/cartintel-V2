/**
 * Merchant & Provider Capability Registry Module.
 * Phase 4.3 — Universal Recommendation Intelligence
 */

import { ProductDomain, areDomainsCompatible } from "./domain";
import type { RecommendationCandidate } from "./recommendationTypes";

export interface MerchantCapability {
  name: string;
  domainName: string;
  supportedDomains: string[];
  supportedCategories: string[];
  supportedProductTypes?: string[];
  supportedBrands?: string[];
  priority: number; // Lower = higher priority
}

/**
 * Deterministic capability registry of supported merchants across domains.
 */
export const MERCHANT_REGISTRY: MerchantCapability[] = [
  // --- ELECTRONICS ---
  {
    name: "Croma",
    domainName: "croma.com",
    supportedDomains: [ProductDomain.Electronics],
    supportedCategories: ["Electronics", "Smartphones", "Laptops", "Tablets", "Headphones", "Televisions"],
    priority: 1
  },
  {
    name: "Reliance Digital",
    domainName: "reliancedigital.in",
    supportedDomains: [ProductDomain.Electronics],
    supportedCategories: ["Electronics", "Smartphones", "Laptops", "Televisions"],
    priority: 2
  },
  {
    name: "Samsung Official Store",
    domainName: "samsung.com",
    supportedDomains: [ProductDomain.Electronics],
    supportedCategories: ["Electronics", "Smartphones", "Tablets", "Televisions"],
    supportedBrands: ["samsung"],
    priority: 1
  },
  {
    name: "Apple Official Store",
    domainName: "apple.com",
    supportedDomains: [ProductDomain.Electronics],
    supportedCategories: ["Electronics", "Smartphones", "Laptops", "Tablets", "Smartwatch"],
    supportedBrands: ["apple"],
    priority: 1
  },

  // --- FASHION ---
  {
    name: "Myntra",
    domainName: "myntra.com",
    supportedDomains: [ProductDomain.Fashion],
    supportedCategories: ["Fashion", "Apparel", "Shoes", "Clothing", "Footwear"],
    priority: 1
  },
  {
    name: "AJIO",
    domainName: "ajio.com",
    supportedDomains: [ProductDomain.Fashion],
    supportedCategories: ["Fashion", "Apparel", "Shoes", "Clothing", "Footwear"],
    priority: 2
  },
  {
    name: "H&M Official Store",
    domainName: "hm.com",
    supportedDomains: [ProductDomain.Fashion],
    supportedCategories: ["Fashion", "Apparel", "Clothing"],
    supportedBrands: ["h&m", "hm"],
    priority: 1
  },
  {
    name: "Puma Official Store",
    domainName: "puma.com",
    supportedDomains: [ProductDomain.Fashion],
    supportedCategories: ["Fashion", "Shoes", "Footwear", "Apparel"],
    supportedBrands: ["puma"],
    priority: 1
  },
  {
    name: "Nike Official Store",
    domainName: "nike.com",
    supportedDomains: [ProductDomain.Fashion],
    supportedCategories: ["Fashion", "Shoes", "Footwear", "Apparel"],
    supportedBrands: ["nike"],
    priority: 1
  },

  // --- BEAUTY & PERSONAL CARE ---
  {
    name: "Nykaa",
    domainName: "nykaa.com",
    supportedDomains: [ProductDomain.Beauty],
    supportedCategories: ["Beauty & Personal Care", "Skincare", "Cosmetics", "Serum", "Shampoo", "Cream & Lotion"],
    priority: 1
  },
  {
    name: "Sephora",
    domainName: "sephora.nnnow.com",
    supportedDomains: [ProductDomain.Beauty],
    supportedCategories: ["Beauty & Personal Care", "Skincare", "Cosmetics", "Makeup"],
    priority: 2
  },

  // --- GROCERY ---
  {
    name: "Blinkit",
    domainName: "blinkit.com",
    supportedDomains: [ProductDomain.Grocery],
    supportedCategories: ["Grocery", "Food & Beverage", "Snacks"],
    priority: 1
  },
  {
    name: "BigBasket",
    domainName: "bigbasket.com",
    supportedDomains: [ProductDomain.Grocery],
    supportedCategories: ["Grocery", "Food & Beverage"],
    priority: 1
  },

  // --- FURNITURE ---
  {
    name: "Pepperfry",
    domainName: "pepperfry.com",
    supportedDomains: [ProductDomain.Furniture],
    supportedCategories: ["Furniture", "Home & Living"],
    priority: 1
  },
  {
    name: "IKEA",
    domainName: "ikea.com",
    supportedDomains: [ProductDomain.Furniture],
    supportedCategories: ["Furniture", "Home & Living"],
    priority: 1
  },

  // --- BOOKS ---
  {
    name: "Bookchor",
    domainName: "bookchor.com",
    supportedDomains: [ProductDomain.Books],
    supportedCategories: ["Books", "Media & Publications"],
    priority: 1
  },

  // --- MULTI-DOMAIN GENERIC MARKETPLACES ---
  {
    name: "Amazon",
    domainName: "amazon.in",
    supportedDomains: [
      ProductDomain.Electronics,
      ProductDomain.Fashion,
      ProductDomain.Beauty,
      ProductDomain.Grocery,
      ProductDomain.Furniture,
      ProductDomain.Books,
      ProductDomain.General
    ],
    supportedCategories: ["*"],
    priority: 3
  },
  {
    name: "Flipkart",
    domainName: "flipkart.com",
    supportedDomains: [
      ProductDomain.Electronics,
      ProductDomain.Fashion,
      ProductDomain.Beauty,
      ProductDomain.Grocery,
      ProductDomain.Furniture,
      ProductDomain.Books,
      ProductDomain.General
    ],
    supportedCategories: ["*"],
    priority: 3
  }
];

/**
 * Returns eligible merchants/providers for a given target domain, category, and brand.
 * Includes brand-specific official discovery targets when brand matches.
 */
export function getEligibleMerchantsForProduct(
  domain: string,
  category?: string | null,
  brand?: string | null
): MerchantCapability[] {
  const normDom = domain.trim();
  const normCat = (category || "").trim().toLowerCase();
  const normBrand = (brand || "").trim().toLowerCase();

  return MERCHANT_REGISTRY.filter(m => {
    // 1. Check Domain support
    const supportsDomain = m.supportedDomains.some(d => areDomainsCompatible(d, normDom));
    if (!supportsDomain) return false;

    // 2. Brand-specific matching if brand is specified on merchant
    if (normBrand && m.supportedBrands && m.supportedBrands.length > 0) {
      const brandMatch = m.supportedBrands.some(b => normBrand.includes(b) || b.includes(normBrand));
      if (brandMatch) return true;
    }

    // 3. Category matching
    if (m.supportedCategories.includes("*")) return true;
    if (!normCat) return true;

    return m.supportedCategories.some(c => c.toLowerCase().includes(normCat) || normCat.includes(c.toLowerCase()));
  }).sort((a, b) => a.priority - b.priority);
}

/**
 * Filters candidates acquired from generic multi-domain marketplaces (e.g. Amazon, Flipkart)
 * to ensure candidates belonging to a different domain or incompatible productType do not leak into target domain recommendations.
 */
export function filterCandidatesByDomain(
  candidates: RecommendationCandidate[],
  targetDomain: string,
  targetProductType?: string | null
): RecommendationCandidate[] {
  if (!candidates || candidates.length === 0) return [];
  const normTargetDomain = targetDomain.trim();
  const normTargetType = (targetProductType || "").trim().toLowerCase();

  return candidates.filter(c => {
    const prodDomain = (c.product?.domain || "").trim();
    if (prodDomain && prodDomain !== ProductDomain.General && normTargetDomain !== ProductDomain.General) {
      if (!areDomainsCompatible(prodDomain, normTargetDomain)) {
        return false; // Hard Domain Boundary Rejection
      }
    }

    // Product Type separation within domain if both target and candidate specify productType
    const prodType = (c.product?.productType || "").trim().toLowerCase();
    if (normTargetType && prodType && normTargetType !== "uncategorized") {
      // Incompatible product types in the same domain (e.g. Smartphone vs Smartwatch)
      if (
        (normTargetType === "smartphone" && prodType === "smartwatch") ||
        (normTargetType === "smartwatch" && prodType === "smartphone") ||
        (normTargetType === "smartphone" && prodType === "television") ||
        (normTargetType === "laptop" && prodType === "shoes")
      ) {
        return false;
      }
    }

    return true;
  });
}
