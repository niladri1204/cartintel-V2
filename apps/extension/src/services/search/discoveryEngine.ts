import type {
  SearchProvider,
  SearchResponse,
} from "./searchProvider";

import {
  generateSearchQueries,
} from "./queryGenerator";
import type {
  SearchQueryInput,
} from "./queryGenerator";

import type {
  RawProductResult,
} from "./types";

import {
  MAX_SEARCH_QUERIES_PER_ANALYSIS,
  selectCoverageQueries,
} from "../../intelligence/merchantCoverage";

export interface DiscoveryResult {
  queries: SearchResponse[];
  candidates: RawProductResult[];
}

export class DiscoveryEngine {
  private readonly provider: SearchProvider;

  constructor(
    provider: SearchProvider
  ) {
    this.provider = provider;
  }

  async discover(
    input: SearchQueryInput
  ): Promise<DiscoveryResult> {
    const allQueries = generateSearchQueries(input);

    // Select high-information queries up to the search budget
    const selectedQueries = selectCoverageQueries(allQueries);

    console.log(`[Search] Budget: ${MAX_SEARCH_QUERIES_PER_ANALYSIS} max queries`);
    console.log(`[Search] Generated ${allQueries.length} queries, selected ${selectedQueries.length}:`);
    for (const q of selectedQueries) {
      console.log(`  → [${q.type}] "${q.query}" (priority ${q.priority})`);
    }

    const responses: SearchResponse[] = [];
    const seenMerchants = new Set<string>();

    for (let i = 0; i < selectedQueries.length; i++) {
      const query = selectedQueries[i];

      try {
        const response = await this.provider.search({
          query,
          maxResults: 40,
        });

        responses.push(response);

        // Track discovered merchants for logging
        for (const product of response.products) {
          const merchant = (product.source || product.marketplace || "").toLowerCase().trim();
          if (merchant && merchant !== "unknown source") {
            seenMerchants.add(merchant);
          }
        }

        console.log(`[Search] Query ${i + 1}/${selectedQueries.length} completed: ${response.products.length} results, ${seenMerchants.size} unique raw merchants discovered`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown search error";

        responses.push({
          query,
          products: [],
          provider: this.provider.name,
          searchedAt: new Date().toISOString(),
          error: errorMessage,
        });

        console.warn(`[Search] Query ${i + 1}/${selectedQueries.length} failed: ${errorMessage}`);

        // On 429 rate limit, stop issuing additional queries immediately
        if (errorMessage.includes("429") || errorMessage.includes("rate-limit") || errorMessage.includes("quota")) {
          console.warn("[Search] Rate limit detected — stopping remaining queries");
          break;
        }
      }
    }

    const candidates = responses.flatMap(
      response => response.products
    );

    console.log(`[Search] Discovery complete: ${candidates.length} total candidates from ${responses.length} queries`);

    return {
      queries: responses,
      candidates,
    };
  }
}
