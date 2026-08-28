import type { MarketplaceProvider } from './types';

export const savanaProvider: MarketplaceProvider = {
  matches: (hostname: string) => hostname.includes('savana.com') || hostname.includes('savana.in'),
  extract: () => {
    let title: string | null = null;
    const titleSelectors = ['h1.product-title', 'h1.title', 'h1'];
    for (const s of titleSelectors) {
      const el = document.querySelector(s);
      if (el && el.textContent) {
        title = el.textContent.trim();
        if (title) break;
      }
    }
    if (!title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) title = ogTitle.getAttribute('content');
    }

    let price: number | null = null;
    const priceSelectors = ['.product-price', '.price', 'span.price'];
    for (const s of priceSelectors) {
      const el = document.querySelector(s);
      if (el && el.textContent) {
        const match = el.textContent.match(/[\d,]+\.?\d*/);
        if (match) {
          const p = parseFloat(match[0].replace(/,/g, ''));
          if (!isNaN(p) && p > 0) { price = p; break; }
        }
      }
    }

    let image: string | null = null;
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) image = ogImg.getAttribute('content');

    return { title, price, currency: 'INR', image };
  }
};
