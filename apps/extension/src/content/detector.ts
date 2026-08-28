import type { ProductDetectionResult } from './types';
import { providers } from './providers';
import { 
  getHostname, 
  getCurrentUrl, 
  parseJsonLd, 
  extractFromJsonLd, 
  extractTitle, 
  extractBrandFromPage,
  extractPrice, 
  extractCurrency, 
  extractImage 
} from './extractors';

export function detectProduct(): ProductDetectionResult {
  console.log("[1] Content extraction started");
  const hostname = getHostname();
  const url = getCurrentUrl();
  
  // 1. Specific Provider Extraction
  let providerTitle: string | null = null;
  let providerBrand: string | null = null;
  let providerPrice: number | null = null;
  let providerCurrency: string | null = null;
  let providerImage: string | null = null;
  
  for (const provider of providers) {
    if (provider.matches(hostname)) {
      const data = provider.extract();
      providerTitle = data.title ?? null;
      providerBrand = data.brand ?? null;
      providerPrice = data.price ?? null;
      providerCurrency = data.currency ?? null;
      providerImage = data.image ?? null;
      break;
    }
  }

  // 2. Generic Structured Data
  const jsonLdItems = parseJsonLd();
  const jsonLdProduct = extractFromJsonLd(jsonLdItems, 'Product');

  // 3 & 4. Merge results (Provider > Generic/Metadata/DOM fallback)
  const title = providerTitle ?? extractTitle(jsonLdProduct);
  const brand = providerBrand ?? extractBrandFromPage(jsonLdProduct, url);
  const price = providerPrice ?? extractPrice(jsonLdProduct);
  const currency = providerCurrency ?? extractCurrency(jsonLdProduct);
  const image = providerImage ?? extractImage(jsonLdProduct);

  let isProductPage = false;
  if (jsonLdProduct) {
    isProductPage = true;
  } else if (title && price !== null) {
    isProductPage = true;
  } else if (document.querySelector('meta[property="product:price:amount"]')) {
    isProductPage = true;
  }

  return {
    isProductPage,
    title,
    brand,
    price,
    currency,
    image,
    url,
    hostname
  };
}
