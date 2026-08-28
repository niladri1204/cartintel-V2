import type { MarketplaceProvider } from './types';

export const purplleProvider: MarketplaceProvider = {
  matches: (hostname: string) => hostname.includes('purplle.com'),
  extract: () => {
    // 1. Title Extraction
    let title: string | null = null;
    const titleSelectors = [
      'h1.pdp-title',
      'h1.pp-product-title',
      '.p-name',
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
      '.pdp-price',
      '.pp-price',
      '.final-price',
      '.pp-offer-price',
      '.price-text'
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
      '.pdp-image-container img',
      '.pp-product-img',
      'img[src*="purplle"]',
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
      '.p-brand',
      '.pp-brand',
      'h1.pdp-title'
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
