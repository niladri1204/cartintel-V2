import type { SearchRequest, SearchResult, RawProductResult, ProviderError } from "./types";

/**
 * Backend SearchProvider interface for future marketplace integration
 * (e.g. SerpApi, Google Shopping, custom scrapers).
 * These providers will have access to secure env vars (API keys).
 */
export interface BackendSearchProvider {
  readonly id: string;
  search(request: SearchRequest): Promise<RawProductResult[]>;
}

/**
 * The Secure Search Service Boundary.
 * Orchestrates registered backend providers to perform the actual search securely.
 */
export class BackendSearchService {
  private providers: Map<string, BackendSearchProvider> = new Map();

  registerProvider(provider: BackendSearchProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`CartIntel BackendSearchService: Overwriting existing provider '${provider.id}'`);
    }
    this.providers.set(provider.id, provider);
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    const results: RawProductResult[] = [];
    const errors: ProviderError[] = [];

    const activeProviders = Array.from(this.providers.values());

    if (activeProviders.length === 0) {
      console.warn("CartIntel BackendSearchService: No backend providers registered.");
      return { results, errors };
    }

    const searchPromises = activeProviders.map(async (provider) => {
      try {
        const providerResults = await provider.search(request);
        if (Array.isArray(providerResults)) {
          results.push(...providerResults);
        } else {
          throw new Error(`Provider ${provider.id} did not return an array.`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({
          providerId: provider.id,
          error: errorMessage
        });
        console.error(`CartIntel BackendSearchService: Provider '${provider.id}' failed.`, err);
      }
    });

    await Promise.allSettled(searchPromises);

    return { results, errors };
  }
}

// Export a singleton instance to be used by API routes
export const searchService = new BackendSearchService();

import { SerperGoogleShoppingProvider } from "./providers/SerperGoogleShoppingProvider";
searchService.registerProvider(new SerperGoogleShoppingProvider());
