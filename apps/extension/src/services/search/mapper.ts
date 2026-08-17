import { processProduct } from "../../intelligence/engine";
import type { ProductIntelligence } from "../../intelligence/types";
import type { RawProductResult } from "./types";
import type { RawDetectionData } from "../../intelligence/engine";
import { normalizeMarketplaceName } from "../../intelligence/marketplace";

export function processSearchResults(results: RawProductResult[]): ProductIntelligence[] {
  const processed: ProductIntelligence[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const result of results) {
    try {
      let hostname = result.marketplace;
      try {
        if (result.url) {
          hostname = new URL(result.url).hostname;
        }
      } catch (err) {
        // Fallback to provider's marketplace string if URL parsing fails
      }

      const rawData: RawDetectionData = {
        title: result.title,
        price: result.price,
        currency: result.currency,
        image: result.image,
        url: result.url,
        hostname: hostname
      };

      const intelligence = processProduct(rawData);
      
      // Override metadata.marketplace with derived canonical merchant name
      intelligence.metadata.marketplace = normalizeMarketplaceName(
        result.marketplace,
        result.url,
        hostname
      );
      intelligence.metadata.marketplaceLogo = result.marketplaceLogo;
      intelligence.metadata.googleShoppingProductLink = result.googleShoppingProductLink;
      intelligence.metadata.googleProductId = result.googleProductId;
      intelligence.metadata.googleImmersiveToken = result.googleImmersiveToken;

      console.log(`\n[OFFER URL DEBUG]
merchant: ${intelligence.metadata.marketplace}
productUrl: ${intelligence.originalUrl}
------------------------\n`);

      processed.push(intelligence);
      successCount++;
    } catch (error) {
      failureCount++;
      console.warn(`CartIntel SearchMapper: Failed to process external result "${result.title}"`, error);
    }
  }

  console.log(`CartIntel SearchMapper Diagnostics:
  - Raw results received: ${results.length}
  - Successfully processed: ${successCount}
  - Failed to process: ${failureCount}
  - Fingerprints generated: ${processed.map(p => p.fingerprint).join(', ')}`);

  return processed;
}
