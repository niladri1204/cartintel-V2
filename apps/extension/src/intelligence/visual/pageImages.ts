export interface PageProductImage {
  url: string;
  source: string; // e.g. "img", "srcset", "picture", "lazy-loaded"
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  relevanceScore: number;
  isLikelyProductImage: boolean;
}

interface ImageCandidate {
  url: string;
  source: string;
  element: any;
  alt: string;
  title: string;
  width: number | null;
  height: number | null;
  srcsetWidth: number | null;
}

/**
 * Parses srcset string and returns the highest quality URL and its width descriptor (if available).
 * e.g., "img1.jpg 500w, img2.jpg 1000w" -> { url: "img2.jpg", width: 1000 }
 */
export function parseSrcset(srcset: string): { url: string; width: number | null } | null {
  if (!srcset || srcset.trim() === "") return null;

  const entries = srcset.split(",").map((entry) => entry.trim()).filter(Boolean);
  let bestUrl: string | null = null;
  let maxWidth = 0;

  for (const entry of entries) {
    const parts = entry.split(/\s+/);
    const url = parts[0];
    const descriptor = parts[1];

    if (!url) continue;

    if (!bestUrl) bestUrl = url;

    if (descriptor) {
      if (descriptor.endsWith("w")) {
        const width = parseInt(descriptor.slice(0, -1), 10);
        if (!isNaN(width) && width > maxWidth) {
          maxWidth = width;
          bestUrl = url;
        }
      } else if (descriptor.endsWith("x")) {
        const factor = parseFloat(descriptor.slice(0, -1));
        const estimatedWidth = !isNaN(factor) ? factor * 500 : 0;
        if (estimatedWidth > maxWidth) {
          maxWidth = estimatedWidth;
          bestUrl = url;
        }
      }
    }
  }

  return bestUrl ? { url: bestUrl, width: maxWidth > 0 ? maxWidth : null } : null;
}

/**
 * Extract relevant product images from the active DOM document context.
 */
export function extractPageImages(doc: any, limit: number = 5): PageProductImage[] {
  if (!doc) return [];

  const candidates: ImageCandidate[] = [];

  // Helper to extract absolute URL if possible
  const resolveUrl = (src: string): string => {
    if (!src) return "";
    src = src.trim();
    // In mock environments, or if baseURI is missing, keep the relative url
    try {
      if (doc.baseURI && !src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:")) {
        return new URL(src, doc.baseURI).href;
      }
    } catch (_) {
      // Ignored
    }
    return src;
  };

  // 1. Collect standard <img> elements
  const imgElements = doc.querySelectorAll ? doc.querySelectorAll("img") : [];
  for (const img of imgElements) {
    const src = img.getAttribute("src");
    const srcset = img.getAttribute("srcset");
    const alt = img.getAttribute("alt") || "";
    const title = img.getAttribute("title") || "";
    const widthAttr = img.getAttribute("width");
    const heightAttr = img.getAttribute("height");

    let width: number | null = widthAttr ? parseInt(widthAttr, 10) : null;
    let height: number | null = heightAttr ? parseInt(heightAttr, 10) : null;

    if (width !== null && isNaN(width)) width = null;
    if (height !== null && isNaN(height)) height = null;

    // Check for lazy-loaded attributes
    const lazyAttributes = [
      "data-src",
      "data-lazy",
      "data-original",
      "data-zoom-image",
      "data-old-hires",
      "data-srcset"
    ];
    let lazyUrl: string | null = null;
    let lazySource: string = "";

    for (const attr of lazyAttributes) {
      const val = img.getAttribute(attr);
      if (val && val.trim() !== "") {
        if (attr === "data-srcset") {
          const parsed = parseSrcset(val);
          if (parsed) {
            lazyUrl = parsed.url;
            lazySource = "lazy-loaded-srcset";
          }
        } else {
          lazyUrl = val;
          lazySource = "lazy-loaded";
        }
        break;
      }
    }

    if (lazyUrl) {
      candidates.push({
        url: resolveUrl(lazyUrl),
        source: lazySource,
        element: img,
        alt,
        title,
        width,
        height,
        srcsetWidth: null
      });
    }

    if (srcset) {
      const parsed = parseSrcset(srcset);
      if (parsed) {
        candidates.push({
          url: resolveUrl(parsed.url),
          source: "srcset",
          element: img,
          alt,
          title,
          width,
          height,
          srcsetWidth: parsed.width
        });
      }
    }

    if (src && src.trim() !== "") {
      candidates.push({
        url: resolveUrl(src),
        source: "img",
        element: img,
        alt,
        title,
        width,
        height,
        srcsetWidth: null
      });
    }
  }

  // 2. Collect picture elements source children
  const sourceElements = doc.querySelectorAll ? doc.querySelectorAll("picture source") : [];
  for (const source of sourceElements) {
    const srcset = source.getAttribute("srcset");
    const src = source.getAttribute("src");
    if (srcset) {
      const parsed = parseSrcset(srcset);
      if (parsed) {
        candidates.push({
          url: resolveUrl(parsed.url),
          source: "picture-srcset",
          element: source,
          alt: "",
          title: "",
          width: null,
          height: null,
          srcsetWidth: parsed.width
        });
      }
    } else if (src && src.trim() !== "") {
      candidates.push({
        url: resolveUrl(src),
        source: "picture-src",
        element: source,
        alt: "",
        title: "",
        width: null,
        height: null,
        srcsetWidth: null
      });
    }
  }

  // 3. Deduplicate candidates, keeping the highest quality/width representation
  const uniqueGroups = new Map<string, ImageCandidate[]>();

  for (const c of candidates) {
    if (!c.url || c.url.startsWith("data:image/svg+xml")) continue; // Skip inline SVGs

    // Normalize URL to base path (removing common resizing CDN parameters if possible)
    let cleanUrl = c.url.split("?")[0].split("#")[0].toLowerCase();
    
    // Fallback normalization: strip sizing keywords in path
    cleanUrl = cleanUrl.replace(/_(\d+x\d+|\d+w\d+h)\./, ".");

    const group = uniqueGroups.get(cleanUrl) || [];
    group.push(c);
    uniqueGroups.set(cleanUrl, group);
  }

  const deduplicated: ImageCandidate[] = [];

  for (const group of uniqueGroups.values()) {
    // Select the best candidate in the group (prefer highest resolution or explicit attributes)
    let best = group[0];
    for (let i = 1; i < group.length; i++) {
      const current = group[i];
      const bestWidth = best.srcsetWidth || best.width || 0;
      const currentWidth = current.srcsetWidth || current.width || 0;
      if (currentWidth > bestWidth) {
        best = current;
      } else if (currentWidth === bestWidth) {
        // If resolution is equal, prefer lazy-loaded zoom image or sources with descriptions
        if (current.source.includes("lazy-loaded") || current.alt.length > best.alt.length) {
          best = current;
        }
      }
    }
    deduplicated.push(best);
  }

  // 4. Compute relevance scores using heuristics
  const scoredImages: PageProductImage[] = [];
  const docTitleLower = doc.title ? doc.title.toLowerCase() : "";

  // Helper to split text into distinct words of significance
  const getSignificantWords = (text: string): string[] => {
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !["the", "and", "for", "with", "from", "this", "that"].includes(w));
  };

  const docTitleWords = getSignificantWords(docTitleLower);

  for (const c of deduplicated) {
    let score = 0;

    // A. Dimension checks
    const width = c.srcsetWidth || c.width;
    const height = c.height;

    if (width !== null && height !== null) {
      if (width >= 500 && height >= 500) {
        score += 35;
      } else if (width >= 300 && height >= 300) {
        score += 20;
      }
      
      if (width < 100 || height < 100) {
        score -= 45; // Tiny icon / spacer
      }

      // Aspect ratio check
      const ratio = width / height;
      if (ratio >= 0.75 && ratio <= 1.35) {
        score += 15; // Product gallery style (square-ish)
      } else if (ratio < 0.3 || ratio > 3.0) {
        score -= 30; // Strip banners / headers
      }
    } else if (width !== null) {
      // Width only
      if (width >= 800) score += 30;
      else if (width >= 400) score += 15;
      else if (width < 100) score -= 30;
    } else {
      // Guess dimensions from URL CDN resizing params (e.g. /500x500/, /1000/, w=1000)
      const cdnSizingRegex = /\b(\d{3,4})[x_](\d{3,4})\b|\b(?:w|width|size)=(\d{3,4})\b/i;
      const match = c.url.match(cdnSizingRegex);
      if (match) {
        const wStr = match[1] || match[3];
        const hStr = match[2];
        const w = parseInt(wStr, 10);
        const h = hStr ? parseInt(hStr, 10) : null;
        if (!isNaN(w)) {
          if (w >= 500 && (h === null || h >= 500)) score += 30;
          else if (w >= 300 && (h === null || h >= 300)) score += 15;
          else if (w < 100) score -= 40;
        }
      }
    }

    // B. Selector indicators (product landing selectors)
    let parentClasses = "";
    let parentIds = "";
    
    let parent = c.element.parentElement;
    let parentMatchesGallery = false;
    
    // Traverse up 4 levels to check for gallery/slideshow/product containers
    for (let depth = 0; depth < 4 && parent; depth++) {
      const cls = parent.getAttribute("class") || "";
      const id = parent.getAttribute("id") || "";
      parentClasses += " " + cls;
      parentIds += " " + id;
      
      if (/(gallery|slideshow|carousel|product-main|product-detail|slider|hero-image)/i.test(cls + " " + id)) {
        parentMatchesGallery = true;
      }
      parent = parent.parentElement;
    }

    // Check selectors directly
    if (c.element.matches) {
      const productImgSelectors = [
        "#landingImage",
        "#imgBlkFront",
        "#main-image",
        "[itemprop='image']",
        ".product-image img",
        "[data-test='product-image']"
      ];
      for (const sel of productImgSelectors) {
        try {
          if (c.element.matches(sel)) {
            score += 50;
            break;
          }
        } catch (_) {}
      }
    }

    if (parentMatchesGallery) {
      score += 25;
    }

    // C. Word overlap check with Page Title (alt description matches context)
    if (c.alt && c.alt.trim() !== "") {
      if (c.alt.length > 20) {
        score += 15; // Rich description
      }
      
      const altWords = getSignificantWords(c.alt);
      const overlapCount = altWords.filter((w) => docTitleWords.includes(w)).length;
      if (overlapCount > 0) {
        score += Math.min(30, overlapCount * 10);
      }
    }

    // D. Keyword Penalties (obvious non-product page furniture)
    const combinedTexts = `${c.alt} ${c.title} ${parentClasses} ${parentIds} ${c.url}`.toLowerCase();
    const badKeywords = [
      "logo",
      "icon",
      "social",
      "banner",
      "ad",
      "advertisement",
      "pixel",
      "spinner",
      "spacer",
      "checkout",
      "payment",
      "card",
      "cart",
      "badge",
      "button",
      "menu",
      "nav",
      "footer",
      "header",
      "sign",
      "login",
      "trust",
      "seal",
      "profile",
      "avatar",
      "cookie",
      "star",
      "rating"
    ];

    for (const kw of badKeywords) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(combinedTexts)) {
        score -= 60;
        break;
      }
    }

    // Check specific filename patterns
    const filename = c.url.split("/").pop() || "";
    if (/(spacer\.gif|pixel\.gif|loading\.gif|logo\.(png|jpg|jpeg|gif|svg)|icon\.(png|jpg|jpeg|gif|svg)|advertisement\b)/i.test(filename)) {
      score -= 80;
    }

    scoredImages.push({
      url: c.url,
      source: c.source,
      width: width,
      height: height,
      alt: c.alt || null,
      relevanceScore: score,
      isLikelyProductImage: score >= 35
    });
  }

  // Sort by relevanceScore descending, keeping highest scores first
  scoredImages.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Return limited result
  return scoredImages.slice(0, limit);
}
