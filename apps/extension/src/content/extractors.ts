import { isValidTitle, normalizeImageUrl } from './validators';

export function getHostname(): string {
  return window.location.hostname;
}

export function getCurrentUrl(): string {
  return window.location.href;
}

export function parseJsonLd(): any[] {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const items: any[] = [];
  scripts.forEach((script) => {
    try {
      const data = JSON.parse(script.textContent || '{}');
      if (Array.isArray(data)) {
        items.push(...data);
      } else {
        items.push(data);
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  });
  return items;
}

export function extractFromJsonLd(items: any[], type: string): any {
  let result = null;

  const search = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj['@type'] === type || (Array.isArray(obj['@type']) && obj['@type'].includes(type))) {
      result = obj;
      return;
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (Array.isArray(obj[key])) {
          obj[key].forEach(search);
        } else if (typeof obj[key] === 'object') {
          search(obj[key]);
        }
      }
    }
  };

  for (const item of items) {
    search(item);
    if (result) break;
  }
  return result;
}

export function extractTitle(jsonLdProduct: any): string | null {
  if (jsonLdProduct && jsonLdProduct.name) {
    const title = typeof jsonLdProduct.name === 'string' ? jsonLdProduct.name : null;
    if (isValidTitle(title)) return title;
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const title = ogTitle.getAttribute('content');
    if (isValidTitle(title)) return title;
  }

  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent) {
    const text = h1.textContent.trim();
    if (isValidTitle(text)) return text;
  }

  const titleEl = document.querySelector('title');
  if (titleEl && titleEl.textContent) {
    const text = titleEl.textContent.trim();
    if (isValidTitle(text)) return text;
  }

  return null;
}

export function extractPrice(jsonLdProduct: any): number | null {
  if (jsonLdProduct && jsonLdProduct.offers) {
    const offers = Array.isArray(jsonLdProduct.offers) ? jsonLdProduct.offers[0] : jsonLdProduct.offers;
    if (offers && offers.price) {
      const parsed = parseFloat(offers.price);
      if (!isNaN(parsed)) return parsed;
    }
  }

  const ogPrice = document.querySelector('meta[property="product:price:amount"]');
  if (ogPrice) {
    const val = parseFloat(ogPrice.getAttribute('content') || '');
    if (!isNaN(val)) return val;
  }

  const priceSelectors = [
    '.price', '#price', '[data-test="price"]', '.product-price',
    '[itemprop="price"]', '.a-price-whole'
  ];

  for (const selector of priceSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent) {
      const match = el.textContent.match(/[\d,]+\.?\d*/);
      if (match) {
        const parsed = parseFloat(match[0].replace(/,/g, ''));
        if (!isNaN(parsed)) return parsed;
      }
    }
  }

  return null;
}

export function extractCurrency(jsonLdProduct: any): string | null {
  if (jsonLdProduct && jsonLdProduct.offers) {
    const offers = Array.isArray(jsonLdProduct.offers) ? jsonLdProduct.offers[0] : jsonLdProduct.offers;
    if (offers && offers.priceCurrency) {
      return offers.priceCurrency;
    }
  }

  const ogCurrency = document.querySelector('meta[property="product:price:currency"]');
  if (ogCurrency) {
    return ogCurrency.getAttribute('content');
  }

  const priceSelectors = [
    '.price', '#price', '[data-test="price"]', '.product-price', '[itemprop="price"]'
  ];

  for (const selector of priceSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent) {
      if (el.textContent.includes('$')) return 'USD';
      if (el.textContent.includes('€')) return 'EUR';
      if (el.textContent.includes('£')) return 'GBP';
      if (el.textContent.includes('¥')) return 'JPY';
      if (el.textContent.includes('₹')) return 'INR';
    }
  }

  return null;
}

export function extractImage(jsonLdProduct: any): string | null {
  let imgUrl: string | null = null;

  if (jsonLdProduct && jsonLdProduct.image) {
    if (typeof jsonLdProduct.image === 'string') imgUrl = jsonLdProduct.image;
    else if (Array.isArray(jsonLdProduct.image) && jsonLdProduct.image.length > 0) {
      const first = jsonLdProduct.image[0];
      if (typeof first === 'string') imgUrl = first;
      else if (first && first.url) imgUrl = first.url;
    }
    else if (jsonLdProduct.image.url) imgUrl = jsonLdProduct.image.url;
  }

  if (!imgUrl) {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      imgUrl = ogImage.getAttribute('content');
    }
  }

  if (!imgUrl) {
    const imgSelectors = [
      '#landingImage',
      '#imgBlkFront',
      '.product-image img',
      '#main-image',
      '[data-test="product-image"]',
      'img[itemprop="image"]'
    ];

    for (const selector of imgSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        imgUrl = el.getAttribute('data-old-hires') || el.getAttribute('src');
        if (imgUrl) break;
      }
    }
  }

  if (imgUrl) {
    const normalized = normalizeImageUrl(imgUrl);
    if (normalized) return normalized;
  }

  return null;
}

export function extractBrandFromPage(jsonLdProduct: any, _url?: string): string | null {
  // 1. JSON-LD Product.brand
  if (jsonLdProduct && jsonLdProduct.brand) {
    if (typeof jsonLdProduct.brand === 'string' && jsonLdProduct.brand.trim().length > 0) {
      return jsonLdProduct.brand.trim();
    }
    if (typeof jsonLdProduct.brand === 'object' && jsonLdProduct.brand.name) {
      const name = String(jsonLdProduct.brand.name).trim();
      if (name.length > 0) return name;
    }
  }

  // 2. OpenGraph / Meta brand tags
  const metaBrand = document.querySelector('meta[property="product:brand"], meta[name="brand"], meta[property="og:brand"]');
  if (metaBrand) {
    const val = metaBrand.getAttribute('content');
    if (val && val.trim().length > 0) return val.trim();
  }

  // 3. Schema itemprop or generic DOM brand classes
  const brandSelectors = [
    '[itemprop="brand"]',
    '.brand-name',
    'h1.pdp-title',
    '.pdp-title',
    '#bylineInfo',
    '#brand',
    '.product-brand',
    '[data-test-id="brand-name"]'
  ];

  for (const selector of brandSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent) {
      let txt = el.textContent.trim();
      txt = txt.replace(/^(?:brand|visit the|visit)\s*:?\s*/i, '').replace(/\s*store$/i, '').trim();
      if (txt.length > 0 && txt.length < 50) {
        return txt;
      }
    }
  }

  return null;
}

