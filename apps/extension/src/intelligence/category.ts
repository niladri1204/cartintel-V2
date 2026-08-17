import {
  BEAUTY_KEYWORDS,
  FASHION_KEYWORDS,
  GROCERY_KEYWORDS
} from "./constants";

export interface CategoryInferenceResult {
  category: string;
  productType: string | null;
}

// Product Type mappings and category association rules
interface ProductTypeRule {
  productType: string;
  category: string;
  patterns: (string | RegExp)[];
}

const PRODUCT_TYPE_RULES: ProductTypeRule[] = [
  // --- ELECTRONICS ---
  {
    productType: "Smartphone",
    category: "Electronics",
    patterns: [
      /\b(?:smart\s*phone|phone|mobile|iphone|pixel|oneplus|nothing\s*phone)\b/i,
      /\bgalaxy\s*(?:s\d+|a\d+|z\s*(?:fold|flip)|note)\b/i,
      /\b(?:s25|s24|s23|s22|s21)\s*(?:5g|4g|ultra|plus)?\b/i
    ]
  },
  {
    productType: "Laptop",
    category: "Electronics",
    patterns: [
      /\b(?:laptop|notebook|macbook|thinkpad|ideapad|zenbook|vivobook|legion|alienware|chromebook|surface\s*laptop)\b/i
    ]
  },
  {
    productType: "Tablet",
    category: "Electronics",
    patterns: [
      /\b(?:tablet|ipad|galaxy\s*tab|surface\s*go)\b/i
    ]
  },
  {
    productType: "Headphones",
    category: "Electronics",
    patterns: [
      /\b(?:headphones|headset|wh-1000xm\d*)\b/i
    ]
  },
  {
    productType: "Earbuds",
    category: "Electronics",
    patterns: [
      /\b(?:earbuds|earphones|tws|airpods|galaxy\s*buds|wf-1000xm\d*|neckband)\b/i
    ]
  },
  {
    productType: "Smartwatch",
    category: "Electronics",
    patterns: [
      /\b(?:smartwatch|apple\s*watch|galaxy\s*watch|pixel\s*watch|fitbit)\b/i
    ]
  },
  {
    productType: "Television",
    category: "Electronics",
    patterns: [
      /\b(?:tv|television|smart\s*tv|oled\s*tv|qled\s*tv|bravia)\b/i
    ]
  },
  {
    productType: "Camera",
    category: "Electronics",
    patterns: [
      /\b(?:camera|dslr|mirrorless)\b/i
    ]
  },
  {
    productType: "Monitor",
    category: "Electronics",
    patterns: [
      /\b(?:monitor|gaming\s*monitor)\b/i
    ]
  },
  {
    productType: "Keyboard & Mouse",
    category: "Electronics",
    patterns: [
      /\b(?:keyboard|gaming\s*mouse|trackpad)\b/i
    ]
  },
  {
    productType: "Speaker",
    category: "Electronics",
    patterns: [
      /\b(?:speaker|soundbar|bluetooth\s*speaker|echo\s*dot)\b/i
    ]
  },

  // --- BEAUTY & PERSONAL CARE ---
  {
    productType: "Serum",
    category: "Beauty & Personal Care",
    patterns: [/\bserum\b/i]
  },
  {
    productType: "Shampoo",
    category: "Beauty & Personal Care",
    patterns: [/\bshampoo\b/i]
  },
  {
    productType: "Cream & Lotion",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:cream|lotion|moisturizer|sunscreen)\b/i]
  },
  {
    productType: "Makeup",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:lipstick|makeup|perfume|gel)\b/i]
  },

  // --- FASHION ---
  {
    productType: "Shoes",
    category: "Fashion",
    patterns: [/\b(?:shoe|shoes|sneaker|sneakers|boot|boots|sandals)\b/i]
  },
  {
    productType: "Apparel",
    category: "Fashion",
    patterns: [/\b(?:shirt|t-shirt|dress|jeans|jacket|pants|trousers|hoodie)\b/i]
  },

  // --- GROCERY ---
  {
    productType: "Grocery Item",
    category: "Grocery",
    patterns: [/\b(?:milk|bread|grocery|rice|dal|coffee|tea|sugar|oats|biscuit)\b/i]
  },

  // --- FURNITURE ---
  {
    productType: "Furniture",
    category: "Furniture",
    patterns: [/\b(?:table|chair|sofa|bed|desk|dining\s*table)\b/i]
  },

  // --- BOOKS ---
  {
    productType: "Book",
    category: "Books",
    patterns: [/\b(?:paperback|hardcover|novel|book)\b/i]
  }
];

/**
 * Infers Product Category and Product Type from normalized title.
 */
export function inferCategoryAndType(normalizedTitle: string | null): CategoryInferenceResult {
  if (!normalizedTitle || normalizedTitle.trim().length === 0) {
    return { category: "Uncategorized", productType: null };
  }

  const text = normalizedTitle.toLowerCase();

  // 1. Check Product-Type Rules
  for (const rule of PRODUCT_TYPE_RULES) {
    for (const pattern of rule.patterns) {
      if (typeof pattern === "string") {
        if (text.includes(pattern)) {
          return { category: rule.category, productType: rule.productType };
        }
      } else if (pattern.test(text)) {
        return { category: rule.category, productType: rule.productType };
      }
    }
  }

  // 2. Check Technical Spec Combinations for Electronics (e.g. RAM + Storage + 5G/4G/Processor)
  const hasRam = /\b\d+\s*gb\s*ram\b/i.test(text);
  const hasStorage = /\b\d+\s*(?:gb|tb)\b/i.test(text);
  const hasConnectivity = /\b(?:5g|4g|lte)\b/i.test(text);
  const hasProcessor = /\b(?:snapdragon|dimensity|exynos|bionic)\b/i.test(text);

  if ((hasRam && hasStorage) || (hasStorage && (hasConnectivity || hasProcessor))) {
    return { category: "Electronics", productType: "Smartphone" };
  }

  // 3. Category Keyword Fallback
  if (BEAUTY_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Beauty & Personal Care", productType: null };
  }
  if (FASHION_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Fashion", productType: null };
  }
  if (GROCERY_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Grocery", productType: null };
  }

  // 4. Genuine Unknown / Uncategorized Fallback
  return { category: "Uncategorized", productType: null };
}

/**
 * Legacy wrapper function returning category string for backward compatibility.
 */
export function determineCategory(normalizedTitle: string | null): string | null {
  const result = inferCategoryAndType(normalizedTitle);
  return result.category;
}
