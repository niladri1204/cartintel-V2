import type { MarketplaceProvider } from './types';
import { isValidImageUrl } from '../validators';

export const myntraProvider: MarketplaceProvider = {
  matches: (hostname: string) => hostname.includes('myntra.com'),
  extract: () => {
    // 1. Title Extraction: Combine Brand (pdp-title) + Product Name (pdp-name)
    let title: string | null = null;
    const brandEl = document.querySelector('h1.pdp-title, .pdp-title');
    const nameEl = document.querySelector('h1.pdp-name, .pdp-name');

    const brandTxt = brandEl?.textContent?.trim() || '';
    const nameTxt = nameEl?.textContent?.trim() || '';

    if (brandTxt && nameTxt && !nameTxt.toLowerCase().startsWith(brandTxt.toLowerCase())) {
      title = `${brandTxt} ${nameTxt}`;
    } else if (nameTxt) {
      title = nameTxt;
    } else if (brandTxt) {
      title = brandTxt;
    }

    if (!title || title.length < 5) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        const rawOg = ogTitle.getAttribute('content') || '';
        const cleaned = rawOg
          .replace(/^Buy\s+/i, '')
          .replace(/\s+Online\s*-\s*Myntra\b/i, '')
          .replace(/\s*-\s*Myntra\b/i, '')
          .trim();
        if (cleaned.length >= 3) {
          title = cleaned;
        }
      }
    }

    // 2. Price Extraction
    let price: number | null = null;
    const priceSelectors = [
      '.pdp-price strong',
      'span.pdp-price',
      '.pdp-price',
      'span.pdp-mrp',
      '.pdp-discount-container .pdp-price'
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

    // 3. Image Extraction: Prioritize og:image & high-res product gallery photos
    let image: string | null = null;

    // Check OpenGraph product image first (always official high-res product photo on Myntra)
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const ogUrl = ogImage.getAttribute('content');
      if (isValidImageUrl(ogUrl)) {
        image = ogUrl;
      }
    }

    // Fallback: Check Myntra gallery image grids & pdp-image elements
    if (!image) {
      const gridEls = document.querySelectorAll('.image-grid-image, .pdp-image img, div[style*="background-image"]');
      for (let i = 0; i < gridEls.length; i++) {
        const el = gridEls[i];
        let candidateUrl: string | null = null;

        if (el.tagName.toLowerCase() === 'img') {
          candidateUrl = el.getAttribute('src') || el.getAttribute('data-src');
        } else {
          const style = el.getAttribute('style') || '';
          const bgMatch = style.match(/url\(["']?(https?:[^"'\)]+)["']?\)/i);
          if (bgMatch) {
            candidateUrl = bgMatch[1];
          }
        }

        if (candidateUrl && isValidImageUrl(candidateUrl)) {
          image = candidateUrl;
          break;
        }
      }
    }

    // Fallback: any product image under assets.myntassets.com/assets/images
    if (!image) {
      const allImgs = document.querySelectorAll('img[src*="assets/images"]');
      for (let i = 0; i < allImgs.length; i++) {
        const src = allImgs[i].getAttribute('src');
        if (isValidImageUrl(src)) {
          image = src;
          break;
        }
      }
    }

    return {
      title,
      brand: brandTxt || null,
      price,
      currency: 'INR',
      image
    };
  }
};
