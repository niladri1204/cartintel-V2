import type { MarketplaceProvider } from './types';

export const nykaaProvider: MarketplaceProvider = {
  matches: (hostname: string) => hostname.includes('nykaa.com') || hostname.includes('nykaafashion.com'),
  extract: () => {
    // 1. Title Extraction
    let title: string | null = null;
    const titleSelectors = [
      'h1.css-1gc4x72',
      'h1.title',
      'h1[data-test-id="product-title"]',
      'h1.css-12345',
      '.product-title',
      'h1'
    ];

    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        const txt = el.textContent.trim();
        if (txt.length >= 3) {
          title = txt;
          break;
        }
      }
    }

    if (!title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        title = ogTitle.getAttribute('content');
      }
    }

    // 2. Price Extraction
    let price: number | null = null;
    const priceSelectors = [
      '.css-1jczs19',
      '.css-11116ly',
      '.post-discount-price',
      '.css-10n2b5k',
      '[data-test-id="product-price"]'
    ];

    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        const match = el.textContent.match(/[\d,]+\.?\d*/);
        if (match) {
          const parsed = parseFloat(match[0].replace(/,/g, ''));
          if (!isNaN(parsed) && parsed > 0) {
            price = parsed;
            break;
          }
        }
      }
    }

    if (price === null) {
      const ogPrice = document.querySelector('meta[property="product:price:amount"]');
      if (ogPrice) {
        const val = parseFloat(ogPrice.getAttribute('content') || '');
        if (!isNaN(val) && val > 0) price = val;
      }
    }

    // 3. Image Extraction
    let image: string | null = null;
    const imgSelectors = [
      'img.css-114y0bf',
      'img[data-test-id="product-image"]',
      '.css-114y0bf img',
      'meta[property="og:image"]'
    ];

    for (const selector of imgSelectors) {
      if (selector.startsWith('meta')) {
        const el = document.querySelector(selector);
        if (el) {
          image = el.getAttribute('content');
          if (image) break;
        }
      } else {
        const el = document.querySelector(selector) as HTMLImageElement | null;
        if (el) {
          image = el.getAttribute('src') || el.getAttribute('data-src');
          if (image) break;
        }
      }
    }

    // Brand Extraction
    let brand: string | null = null;
    const brandSelectors = [
      '.brand-name',
      'h1.css-1gc4x72',
      '[data-test-id="brand-name"]',
      '.css-1gc4x72'
    ];
    for (const selector of brandSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        const txt = el.textContent.trim();
        if (txt.length >= 2 && txt.length < 50) {
          brand = txt;
          break;
        }
      }
    }

    return {
      title,
      brand,
      price,
      currency: 'INR',
      image
    };
  }
};
