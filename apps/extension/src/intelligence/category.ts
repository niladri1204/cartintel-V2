import {
  BEAUTY_KEYWORDS,
  FASHION_KEYWORDS,
  GROCERY_KEYWORDS,
  ELECTRONICS_KEYWORDS,
  FURNITURE_KEYWORDS,
  BOOKS_KEYWORDS
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
      /\b(?:television|smart\s*tv|oled\s*tv|qled\s*tv|bravia|\btv\b(?![\s-]*(?:unit|stand|cabinet|table|bench|rack|mount|shelf|console)))\b/i
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
    productType: "Hair Treatment",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:hair\s*oil|hair\s*serum|hair\s*mask)\b/i]
  },
  {
    productType: "Serum",
    category: "Beauty & Personal Care",
    patterns: [/\bserum\b/i]
  },
  {
    productType: "Sunscreen",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:sunscreen|sunblock|spf)\b/i]
  },
  {
    productType: "Cleanser",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:cleanser|face\s*wash|facewash|micellar)\b/i]
  },
  {
    productType: "Moisturizer",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:moisturizer|face\s*cream|day\s*cream|night\s*cream|lotion)\b/i]
  },
  {
    productType: "Toner",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:toner|essence|mist)\b/i]
  },
  {
    productType: "Face Mask",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:face\s*mask|sheet\s*mask|clay\s*mask)\b/i]
  },
  {
    productType: "Foundation",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:foundation|bb\s*cream|cc\s*cream)\b/i]
  },
  {
    productType: "Concealer",
    category: "Beauty & Personal Care",
    patterns: [/\bconcealer\b/i]
  },
  {
    productType: "Lip Product",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:lipstick|lip\s*balm|lip\s*gloss|lip\s*tint)\b/i]
  },
  {
    productType: "Mascara",
    category: "Beauty & Personal Care",
    patterns: [/\bmascara\b/i]
  },
  {
    productType: "Shampoo",
    category: "Beauty & Personal Care",
    patterns: [/\bshampoo\b/i]
  },
  {
    productType: "Conditioner",
    category: "Beauty & Personal Care",
    patterns: [/\bconditioner\b/i]
  },
  {
    productType: "Fragrance",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:perfume|eau\s*de\s*parfum|edp|edt|fragrance|cologne|body\s*mist)\b/i]
  },
  {
    productType: "Body Care",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:body\s*wash|shower\s*gel|body\s*lotion|body\s*butter)\b/i]
  },
  {
    productType: "Skincare",
    category: "Beauty & Personal Care",
    patterns: [/\b(?:skincare|cosmetics?)\b/i]
  },

  // --- FASHION & FOOTWEAR ---
  {
    productType: "Running Shoes",
    category: "Fashion",
    patterns: [/\b(?:running\s*shoes?|marathon\s*shoes?)\b/i]
  },
  {
    productType: "Sneakers",
    category: "Fashion",
    patterns: [/\b(?:sneakers?|casual\s*shoes?|lifestyle\s*shoes?)\b/i]
  },
  {
    productType: "Formal Shoes",
    category: "Fashion",
    patterns: [/\b(?:formal\s*shoes?|oxford\s*shoes?|dress\s*shoes?|derby\s*shoes?|brogues?|loafers?)\b/i]
  },
  {
    productType: "Boots",
    category: "Fashion",
    patterns: [/\b(?:boots?|chelsea\s*boots?|ankle\s*boots?)\b/i]
  },
  {
    productType: "Sandals & Floaters",
    category: "Fashion",
    patterns: [/\b(?:sandals?|floaters?|strap\s*sandals?)\b/i]
  },
  {
    productType: "Slides & Flip-Flops",
    category: "Fashion",
    patterns: [/\b(?:slides?|flip\s*flops?|slippers?|thong\s*sandals?)\b/i]
  },
  {
    productType: "Sports Cleats",
    category: "Fashion",
    patterns: [/\b(?:football\s*cleats?|cleats?|studs?|spike\s*shoes?)\b/i]
  },
  {
    productType: "Training Shoes",
    category: "Fashion",
    patterns: [/\b(?:training\s*shoes?|cross\s*trainer|gym\s*shoes?)\b/i]
  },
  {
    productType: "Walking Shoes",
    category: "Fashion",
    patterns: [/\b(?:walking\s*shoes?)\b/i]
  },
  {
    productType: "Basketball Shoes",
    category: "Fashion",
    patterns: [/\b(?:basketball\s*shoes?)\b/i]
  },
  {
    productType: "Shoes",
    category: "Fashion",
    patterns: [/\b(?:shoe|shoes|footwear)\b/i]
  },
  {
    productType: "T-Shirt",
    category: "Fashion",
    patterns: [/\b(?:t-?shirt|tee|polo)\b/i]
  },
  {
    productType: "Shirt",
    category: "Fashion",
    patterns: [/\b(?:shirt|button\s*down)\b/i]
  },
  {
    productType: "Jeans",
    category: "Fashion",
    patterns: [/\b(?:jeans|denim\s*pants?)\b/i]
  },
  {
    productType: "Pants & Trousers",
    category: "Fashion",
    patterns: [/\b(?:pants|trousers|chinos|cargos?)\b/i]
  },
  {
    productType: "Dress",
    category: "Fashion",
    patterns: [/\b(?:dress|gown|maxi\s*dress)\b/i]
  },
  {
    productType: "Skirt",
    category: "Fashion",
    patterns: [/\b(?:skirt|mini\s*skirt)\b/i]
  },
  {
    productType: "Jacket",
    category: "Fashion",
    patterns: [/\b(?:jacket|blazer|coat|windbreaker)\b/i]
  },
  {
    productType: "Hoodie & Sweatshirt",
    category: "Fashion",
    patterns: [/\b(?:hoodie|sweatshirt|pullover)\b/i]
  },
  {
    productType: "Sweater",
    category: "Fashion",
    patterns: [/\b(?:sweater|cardigan)\b/i]
  },
  {
    productType: "Shorts",
    category: "Fashion",
    patterns: [/\b(?:shorts|bermudas?)\b/i]
  },
  {
    productType: "Ethnic Wear",
    category: "Fashion",
    patterns: [/\b(?:kurti|saree|kurtas?|ethnic\s*wear|lehenga|sherwani)\b/i]
  },
  {
    productType: "Apparel",
    category: "Fashion",
    patterns: [/\b(?:apparel|clothing|garment)\b/i]
  },

  // --- GROCERY ---
  {
    productType: "Beverages",
    category: "Grocery",
    patterns: [/\b(?:beverage|soft\s*drink|soda|coke|coca[-\s]*cola|pepsi|juice|energy\s*drink)\b/i]
  },
  {
    productType: "Coffee",
    category: "Grocery",
    patterns: [/\b(?:coffee|espresso|instant\s*coffee)\b/i]
  },
  {
    productType: "Tea",
    category: "Grocery",
    patterns: [/\b(?:tea|green\s*tea|black\s*tea|chai)\b/i]
  },
  {
    productType: "Snacks & Chips",
    category: "Grocery",
    patterns: [/\b(?:snacks?|chips|wafers?|namkeen|popcorn|lay's|lays)\b/i]
  },
  {
    productType: "Biscuits",
    category: "Grocery",
    patterns: [/\b(?:biscuits?|cookies?|crackers?)\b/i]
  },
  {
    productType: "Chocolate",
    category: "Grocery",
    patterns: [/\b(?:chocolates?|cocoa)\b/i]
  },
  {
    productType: "Rice & Grains",
    category: "Grocery",
    patterns: [/\b(?:rice|basmati|poha|quinoa|oats)\b/i]
  },
  {
    productType: "Flour & Pulses",
    category: "Grocery",
    patterns: [/\b(?:flour|atta|maida|dal|pulses)\b/i]
  },
  {
    productType: "Noodles & Pasta",
    category: "Grocery",
    patterns: [/\b(?:noodles?|maggi|pasta|ramen|spaghetti)\b/i]
  },
  {
    productType: "Cooking Oil",
    category: "Grocery",
    patterns: [/\b(?:cooking\s*oil|sunflower\s*oil|mustard\s*oil|olive\s*oil|ghee)\b/i]
  },
  {
    productType: "Spices & Seasoning",
    category: "Grocery",
    patterns: [/\b(?:spices?|masala|turmeric|chilli\s*powder|salt|sugar)\b/i]
  },
  {
    productType: "Dairy",
    category: "Grocery",
    patterns: [/\b(?:milk|butter|cheese|paneer|curd|yogurt)\b/i]
  },
  {
    productType: "Packaged Foods",
    category: "Grocery",
    patterns: [/\b(?:packaged\s*food|ready\s*to\s*eat|canned)\b/i]
  },
  {
    productType: "Grocery Item",
    category: "Grocery",
    patterns: [/\bgrocery\b/i]
  },

  // --- FURNITURE ---
  {
    productType: "Sofa",
    category: "Furniture",
    patterns: [/\b(?:sofa|couch|sectional\s*sofa)\b/i]
  },
  {
    productType: "Recliner",
    category: "Furniture",
    patterns: [/\b(?:recliner|reclining\s*chair)\b/i]
  },
  {
    productType: "Office Chair",
    category: "Furniture",
    patterns: [/\b(?:office\s*chair|executive\s*chair|ergonomic\s*chair)\b/i]
  },
  {
    productType: "Chair",
    category: "Furniture",
    patterns: [/\b(?:chair|armchair|stool)\b/i]
  },
  {
    productType: "Dining Table",
    category: "Furniture",
    patterns: [/\b(?:dining\s*table|dining\s*set)\b/i]
  },
  {
    productType: "Coffee Table",
    category: "Furniture",
    patterns: [/\b(?:coffee\s*table|center\s*table)\b/i]
  },
  {
    productType: "Side Table",
    category: "Furniture",
    patterns: [/\b(?:side\s*table|end\s*table|bedside\s*table)\b/i]
  },
  {
    productType: "Desk",
    category: "Furniture",
    patterns: [/\b(?:desk|study\s*table|writing\s*table)\b/i]
  },
  {
    productType: "Bed Frame",
    category: "Furniture",
    patterns: [/\b(?:bed\s*frame|cot)\b/i]
  },
  {
    productType: "Bed",
    category: "Furniture",
    patterns: [/\b(?:bed|bunk\s*bed)\b/i]
  },
  {
    productType: "Wardrobe",
    category: "Furniture",
    patterns: [/\b(?:wardrobe|closet|almirah)\b/i]
  },
  {
    productType: "TV Unit",
    category: "Furniture",
    patterns: [/\b(?:tv\s*unit|tv\s*stand|tv\s*cabinet|entertainment\s*unit)\b/i]
  },
  {
    productType: "Cabinet",
    category: "Furniture",
    patterns: [/\b(?:cabinet|sideboard|credenza)\b/i]
  },
  {
    productType: "Bookshelf",
    category: "Furniture",
    patterns: [/\b(?:bookshelf|bookcase|display\s*rack)\b/i]
  },
  {
    productType: "Dresser",
    category: "Furniture",
    patterns: [/\b(?:dresser|chest\s*of\s*drawers)\b/i]
  },
  {
    productType: "Mattress",
    category: "Furniture",
    patterns: [/\b(?:mattress)\b/i]
  },

  // --- BOOKS ---
  {
    productType: "Novel",
    category: "Books",
    patterns: [/\b(?:novel)\b/i]
  },
  {
    productType: "Textbook",
    category: "Books",
    patterns: [/\b(?:textbook|coursebook)\b/i]
  },
  {
    productType: "Academic Book",
    category: "Books",
    patterns: [/\b(?:academic\s*book|scholarly|monograph)\b/i]
  },
  {
    productType: "Reference Book",
    category: "Books",
    patterns: [/\b(?:dictionary|encyclopedia|atlas|reference\s*book)\b/i]
  },
  {
    productType: "Guide",
    category: "Books",
    patterns: [/\b(?:guidebook|travel\s*guide|user\s*guide)\b/i]
  },
  {
    productType: "Biography",
    category: "Books",
    patterns: [/\b(?:biography)\b/i]
  },
  {
    productType: "Autobiography",
    category: "Books",
    patterns: [/\b(?:autobiography|memoir)\b/i]
  },
  {
    productType: "Cookbook",
    category: "Books",
    patterns: [/\b(?:cookbook|recipe\s*book)\b/i]
  },
  {
    productType: "Children's Book",
    category: "Books",
    patterns: [/\b(?:children'?s?\s*book|picture\s*book)\b/i]
  },
  {
    productType: "Comic & Graphic Novel",
    category: "Books",
    patterns: [/\b(?:comic|graphic\s*novel|manga)\b/i]
  },
  {
    productType: "Poetry",
    category: "Books",
    patterns: [/\b(?:poetry|poems)\b/i]
  },
  {
    productType: "Self-Help",
    category: "Books",
    patterns: [/\b(?:self[-\s]*help|motivation|personal\s*growth)\b/i]
  },
  {
    productType: "Fiction",
    category: "Books",
    patterns: [/\b(?:fiction)\b/i]
  },
  {
    productType: "Non-Fiction",
    category: "Books",
    patterns: [/\b(?:non[-\s]*fiction)\b/i]
  },
  {
    productType: "Book",
    category: "Books",
    patterns: [/\b(?:paperback|hardcover|hardback|kindle|audiobook|book)\b/i]
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
  if (ELECTRONICS_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Electronics", productType: null };
  }
  if (FURNITURE_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Furniture", productType: null };
  }
  if (BOOKS_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Books", productType: null };
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
