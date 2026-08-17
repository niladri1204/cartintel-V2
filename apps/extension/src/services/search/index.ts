import type { ProductIntelligence } from "../../intelligence/types";
import type { 
  SearchProvider, 
  SearchRequest, 
  SearchResult, 
  ProviderError, 
  RawProductResult 
} from "./types";

export * from "./types";
export * from "./mapper";
export * from "./CartIntelApiProvider";

import { CartIntelApiProvider } from "./CartIntelApiProvider";

export class SearchService {
  private providers: Map<string, SearchProvider> = new Map();

  /**
   * Register a new search provider into the service.
   */
  registerProvider(provider: SearchProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`CartIntel SearchService: Overwriting existing provider '${provider.id}'`);
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Create a provider-agnostic SearchRequest from a ProductIntelligence object.
   */
  private buildRequest(intelligence: ProductIntelligence): SearchRequest {
    return {
      normalizedTitle: intelligence.normalizedTitle,
      brand: intelligence.brand,
      model: intelligence.model,
      category: intelligence.category,
      productType: intelligence.productType,
      variant: intelligence.variant,
      color: intelligence.color,
      storage: intelligence.storage,
      ram: intelligence.ram,
      fingerprint: intelligence.fingerprint
    };
  }

  /**
   * Orchestrate search across all registered (or specified) providers.
   * Gracefully handles and aggregates errors so one failure doesn't halt the process.
   */
  async search(intelligence: ProductIntelligence, providerIds?: string[]): Promise<SearchResult> {
    const request = this.buildRequest(intelligence);
    const results: RawProductResult[] = [];
    const errors: ProviderError[] = [];

    // Filter providers to use based on the requested providerIds, if any.
    const activeProviders = Array.from(this.providers.values()).filter(provider => 
      !providerIds || providerIds.includes(provider.id)
    );

    if (activeProviders.length === 0) {
      console.warn("CartIntel SearchService: No active providers found for search.");
      return { results, errors };
    }

    // Execute provider searches concurrently
    const searchPromises = activeProviders.map(async (provider) => {
      try {
        const providerResults = await provider.search(request);
        // Ensure provider doesn't accidentally return null/undefined instead of empty array
        if (Array.isArray(providerResults)) {
          console.log(`[Diagnostic 2] SearchService received from ${provider.id}: ${providerResults.length}`);
          results.push(...providerResults);
        } else {
          throw new Error(`Provider ${provider.id} did not return an array of results.`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({
          providerId: provider.id,
          error: errorMessage
        });
        console.error(`CartIntel SearchService: Provider '${provider.id}' failed.`, err);
      }
    });

    await Promise.allSettled(searchPromises);

    console.log(`[Diagnostic 3] SearchService passing to orchestrator: ${results.length}`);

    return {
      results,
      errors
    };
  }
}

export const searchService = new SearchService();
searchService.registerProvider(new CartIntelApiProvider());
