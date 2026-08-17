import type {
  RawProductResult,
} from "./types";

import type {
  GeneratedSearchQuery,
} from "./queryGenerator";

export interface SearchRequest {
  query: GeneratedSearchQuery;
  maxResults?: number;
}

export interface SearchResponse {
  query: GeneratedSearchQuery;

  products: RawProductResult[];

  provider: string;

  searchedAt: string;

  error?: string;
}

export interface SearchProvider {
  readonly name: string;

  search(
    request: SearchRequest
  ): Promise<SearchResponse>;
}
