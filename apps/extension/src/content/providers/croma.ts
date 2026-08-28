import type { ExtractedData, MarketplaceProvider } from './types';
import { parseJsonLd, extractFromJsonLd } from '../extractors';
import { isValidTitle, normalizeImageUrl } from '../validators';

export const cromaProvider: MarketplaceProvider = {
  matches(hostname: string): boolean {
    return hostname === 'croma.com' || hostname.endsWith('.croma.com');
  },

  extract(): ExtractedData {
    const data: ExtractedData = {};

    try {
      const jsonLdItems = parseJsonLd();
      const productObj = extractFromJsonLd(jsonLdItems, 'Product');

      if (productObj) {
        // 1. Title: Product.name
        if (productObj.name && typeof productObj.name === 'string') {
          const rawTitle = productObj.name.trim();
          if (isValidTitle(rawTitle)) {
            data.title = rawTitle;
          }
        }

        // Brand: Product.brand
        if (productObj.brand) {
          if (typeof productObj.brand === 'string') {
            data.brand = productObj.brand.trim();
          } else if (typeof productObj.brand === 'object' && productObj.brand.name) {
            data.brand = String(productObj.brand.name).trim();
          }
        }

        // 2. Price & Currency: Product.offers
        if (productObj.offers) {
          const offers = Array.isArray(productObj.offers)
            ? productObj.offers[0]
            : productObj.offers;

          if (offers) {
            if (offers.price !== undefined && offers.price !== null) {
              const parsedPrice = parseFloat(String(offers.price));
              if (!isNaN(parsedPrice)) {
                data.price = parsedPrice;
              }
            }

            if (offers.priceCurrency && typeof offers.priceCurrency === 'string') {
              data.currency = offers.priceCurrency.trim();
            }
          }
        }

        // 3. Image: Product.image (string or array)
        if (productObj.image) {
          let rawImg: string | null = null;
          if (typeof productObj.image === 'string') {
            rawImg = productObj.image;
          } else if (Array.isArray(productObj.image) && productObj.image.length > 0) {
            const firstImg = productObj.image[0];
            if (typeof firstImg === 'string') {
              rawImg = firstImg;
            } else if (firstImg && typeof firstImg.url === 'string') {
              rawImg = firstImg.url;
            }
          } else if (productObj.image.url && typeof productObj.image.url === 'string') {
            rawImg = productObj.image.url;
          }

          if (rawImg) {
            const normalized = normalizeImageUrl(rawImg, 'croma.com');
            if (normalized) {
              data.image = normalized;
            }
          }
        }
      }

      // Fallback for image if JSON-LD image is unavailable or invalid
      if (!data.image) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          const ogImgUrl = ogImage.getAttribute('content');
          if (ogImgUrl) {
            const normalized = normalizeImageUrl(ogImgUrl, 'croma.com');
            if (normalized) {
              data.image = normalized;
            }
          }
        }
      }
    } catch (e) {
      // Safe fallback - malformed JSON-LD should not crash the detector
    }

    return data;
  }
};
