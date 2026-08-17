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
    const queries =
      generateSearchQueries(input);

    const responses: SearchResponse[] = [];

    for (const query of queries) {
      try {
        const response =
          await this.provider.search({
            query,
            maxResults: 20,
          });

        responses.push(response);
      } catch (error) {
        responses.push({
          query,
          products: [],
          provider: this.provider.name,
          searchedAt: new Date().toISOString(),
          error:
            error instanceof Error
              ? error.message
              : "Unknown search error",
        });
      }
    }

    const candidates =
      responses.flatMap(
        response => response.products
      );

    return {
      queries: responses,
      candidates,
    };
  }
}
