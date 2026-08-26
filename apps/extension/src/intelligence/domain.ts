/**
 * Universal Product Domain Classification & Resolution Engine.
 * Phase 4.3 — Universal Recommendation Intelligence
 */

export const ProductDomain = {
  Electronics: "Electronics",
  Fashion: "Fashion",
  Beauty: "Beauty & Personal Care",
  Grocery: "Grocery",
  Furniture: "Furniture",
  Books: "Books",
  General: "General"
} as const;

export type ProductDomain = (typeof ProductDomain)[keyof typeof ProductDomain];

/**
 * Infers the canonical ProductDomain given a category and/or normalized title.
 */
export function inferDomain(category: string | null | undefined, normalizedTitle?: string | null | undefined): string {
  const normCat = (category || "").trim().toLowerCase();
  const normTitle = (normalizedTitle || "").trim().toLowerCase();

  // 1. Category-based domain resolution
  if (normCat.includes("electronics") || normCat.includes("mobile") || normCat.includes("phone") || normCat.includes("smartphone") || normCat.includes("laptop") || normCat.includes("gadget") || normCat.includes("computer") || normCat.includes("tablet") || normCat.includes("headphone") || normCat.includes("smartwatch") || normCat.includes("tv")) {
    return ProductDomain.Electronics;
  }
  if (normCat.includes("fashion") || normCat.includes("clothing") || normCat.includes("apparel") || normCat.includes("footwear") || normCat.includes("shoe")) {
    return ProductDomain.Fashion;
  }
  if (normCat.includes("beauty") || normCat.includes("cosmetic") || normCat.includes("skincare") || normCat.includes("personal care")) {
    return ProductDomain.Beauty;
  }
  if (normCat.includes("grocery") || normCat.includes("food") || normCat.includes("snack") || normCat.includes("beverage")) {
    return ProductDomain.Grocery;
  }
  if (normCat.includes("furniture") || normCat.includes("home & living") || normCat.includes("living")) {
    return ProductDomain.Furniture;
  }
  if (normCat.includes("book") || normCat.includes("media") || normCat.includes("publication")) {
    return ProductDomain.Books;
  }

  // 2. Title-based domain resolution fallback
  if (normTitle) {
    if (/\b(?:smartphone|phone|mobile|laptop|macbook|ipad|tablet|headphones|earbuds|smartwatch|television|oled tv|4k tv|dslr|monitor|gpu|cpu|ram)\b/i.test(normTitle)) {
      return ProductDomain.Electronics;
    }
    if (/\b(?:shirt|t-shirt|jeans|jacket|pants|dress|shoes|sneakers|boots|sandals|hoodie|trousers|apparel|clothing)\b/i.test(normTitle)) {
      return ProductDomain.Fashion;
    }
    if (/\b(?:serum|shampoo|lotion|moisturizer|sunscreen|lipstick|makeup|perfume|cleanser|skincare)\b/i.test(normTitle)) {
      return ProductDomain.Beauty;
    }
    if (/\b(?:milk|bread|rice|dal|coffee|tea|sugar|oats|biscuit|noodles|pasta|snacks|grocery)\b/i.test(normTitle)) {
      return ProductDomain.Grocery;
    }
    if (/\b(?:table|chair|sofa|bed|desk|dining table|furniture)\b/i.test(normTitle)) {
      return ProductDomain.Furniture;
    }
    if (/\b(?:paperback|hardcover|novel|book|edition)\b/i.test(normTitle)) {
      return ProductDomain.Books;
    }
  }

  return ProductDomain.General;
}

/**
 * Checks whether two domain strings are compatible.
 * Enforces the Hard Domain Boundary constraint:
 * Rejects ONLY when BOTH domains are non-General/Unknown and differ.
 */
export function areDomainsCompatible(d1: string | null | undefined, d2: string | null | undefined): boolean {
  if (!d1 || !d2) return true; // Missing/Unknown domain -> do not reject automatically
  const dom1 = d1.trim();
  const dom2 = d2.trim();

  if (dom1 === ProductDomain.General || dom2 === ProductDomain.General) {
    return true; // General fallback does not hard-conflict
  }

  return dom1.toLowerCase() === dom2.toLowerCase();
}
