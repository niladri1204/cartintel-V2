import type { ExtractedData, MarketplaceProvider } from './types';

export const flipkartProvider: MarketplaceProvider = {
  matches(hostname: string): boolean {
    return hostname === 'flipkart.com' || hostname.endsWith('.flipkart.com');
  },
  
  extract(): ExtractedData {
    // Rely completely on generic fallback for Flipkart as reliable specific
    // selectors are not yet established based on the audit.
    return {};
  }
};
