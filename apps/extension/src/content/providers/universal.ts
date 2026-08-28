import type { MarketplaceProvider } from './types';
import { 
  parseJsonLd, 
  extractFromJsonLd, 
  extractTitle, 
  extractBrandFromPage,
  extractPrice, 
  extractCurrency, 
  extractImage 
} from '../extractors';

export const universalProvider: MarketplaceProvider = {
  // Matches any domain as a generic fallback provider
  matches: () => true,
  extract: () => {
    const jsonLdItems = parseJsonLd();
    const jsonLdProduct = extractFromJsonLd(jsonLdItems, 'Product');

    const title = extractTitle(jsonLdProduct);
    const brand = extractBrandFromPage(jsonLdProduct);
    const price = extractPrice(jsonLdProduct);
    const currency = extractCurrency(jsonLdProduct) || 'INR';
    const image = extractImage(jsonLdProduct);

    return {
      title,
      brand,
      price,
      currency,
      image
    };
  }
};
