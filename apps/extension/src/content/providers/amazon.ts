import type { ExtractedData, MarketplaceProvider } from './types';
import { normalizeImageUrl } from '../validators';

export const amazonProvider: MarketplaceProvider = {
  matches(hostname: string): boolean {
    return hostname === 'amazon.com' || hostname.endsWith('.amazon.com') ||
           hostname === 'amazon.in' || hostname.endsWith('.amazon.in');
  },
  
  extract(): ExtractedData {
    const data: ExtractedData = {};
    
    // Extract Amazon specific title
    const productTitleEl = document.querySelector('#productTitle');
    if (productTitleEl && productTitleEl.textContent) {
      const text = productTitleEl.textContent.trim();
      if (text) {
        data.title = text;
      }
    }

    // Extract Amazon specific brand
    const brandSelectors = [
      '#bylineInfo',
      '#brand',
      'a#bylineInfo',
      'tr.po-brand td.a-span9 span',
      '.po-brand .a-span9'
    ];
    for (const selector of brandSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        let txt = el.textContent.trim();
        txt = txt.replace(/^(?:brand|visit the|visit)\s*:?\s*/i, '').replace(/\s*store$/i, '').trim();
        if (txt.length >= 2 && txt.length < 50) {
          data.brand = txt;
          break;
        }
      }
    }
    
    // Extract Amazon specific image
    const landingImageEl = document.querySelector('#landingImage') || 
                           document.querySelector('#imgBlkFront') || 
                           document.querySelector('#main-image');
    if (landingImageEl) {
      let src = landingImageEl.getAttribute('data-old-hires') || landingImageEl.getAttribute('src');

      const dynamicImgAttr = landingImageEl.getAttribute('data-a-dynamic-image');
      if (dynamicImgAttr) {
        try {
          const parsed = JSON.parse(dynamicImgAttr);
          const urls = Object.keys(parsed);
          if (urls.length > 0) {
            src = urls[0];
          }
        } catch (e) {
          // ignore JSON parse error
        }
      }

      if (src) {
        const normalized = normalizeImageUrl(src, 'amazon.com');
        if (normalized) {
          data.image = normalized;
        }
      }
    }
    
    return data;
  }
};
