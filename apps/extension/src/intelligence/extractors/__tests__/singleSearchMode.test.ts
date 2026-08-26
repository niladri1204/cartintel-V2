import { describe, test, expect } from "vitest";
import { DiscoveryEngine } from "../../../services/search/discoveryEngine";
import { MAX_SEARCH_QUERIES_PER_ANALYSIS } from "../../merchantCoverage";
import type { SearchProvider, SearchRequest, SearchResponse } from "../../../services/search/searchProvider";
import type { SearchQueryInput } from "../../../services/search/queryGenerator";

/**
 * Phase 4.8 — Search Budget & Discovery Engine Offline Tests
 *
 * Verifies that DiscoveryEngine respects the query budget (MAX_SEARCH_QUERIES_PER_ANALYSIS),
 * stops on 429 rate limits, and safely passes candidates to downstream mappers.
 *
 * Zero network requests. All provider calls are mocked.
 */

function createMockProvider(): SearchProvider & { searchCalls: SearchRequest[] } {
  const searchCalls: SearchRequest[] = [];

  return {
    name: "mock-provider",
    searchCalls,
    async search(request: SearchRequest): Promise<SearchResponse> {
      searchCalls.push(request);
      return {
        query: request.query,
        products: [
          {
            title: "OnePlus 15R 5G 256GB",
            price: 54099,
            currency: "INR",
            source: "Zepto",
            url: "https://zepto.in/oneplus-15r",
            image: "",
          },
          {
            title: "OnePlus 15R 5G 256GB",
            price: 59999,
            currency: "INR",
            source: "Amazon.in",
            url: "https://www.amazon.in/dp/B0CSZD1S7S",
            image: "",
          },
        ],
        provider: "mock-provider",
        searchedAt: new Date().toISOString(),
      };
    },
  };
}

function createEmptyMockProvider(): SearchProvider & { searchCalls: SearchRequest[] } {
  const searchCalls: SearchRequest[] = [];

  return {
    name: "mock-provider-empty",
    searchCalls,
    async search(request: SearchRequest): Promise<SearchResponse> {
      searchCalls.push(request);
      return {
        query: request.query,
        products: [],
        provider: "mock-provider-empty",
        searchedAt: new Date().toISOString(),
      };
    },
  };
}

function create429MockProvider(): SearchProvider & { searchCalls: SearchRequest[] } {
  const searchCalls: SearchRequest[] = [];

  return {
    name: "mock-provider-429",
    searchCalls,
    async search(request: SearchRequest): Promise<SearchResponse> {
      searchCalls.push(request);
      throw new Error("Google Shopping provider rate-limit exceeded (429).");
    },
  };
}

const sampleInput: SearchQueryInput = {
  title: "Apple iPad (A16 Chip)",
  brand: "Apple",
  model: "iPad 11 A16 Chip",
  category: "Electronics",
  attributes: {
    storage: "256GB",
    color: "yellow",
    variant: "WiFi",
  },
};

describe("Phase 4.8 — Search Budget & Discovery Engine Offline Tests", () => {
  test("1. MAX_SEARCH_QUERIES_PER_ANALYSIS is configured to 4", () => {
    expect(MAX_SEARCH_QUERIES_PER_ANALYSIS).toBe(4);
  });

  test("2. DiscoveryEngine respects maximum query budget", async () => {
    const mockProvider = createMockProvider();
    const engine = new DiscoveryEngine(mockProvider);

    const result = await engine.discover(sampleInput);

    expect(mockProvider.searchCalls.length).toBeLessThanOrEqual(MAX_SEARCH_QUERIES_PER_ANALYSIS);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  test("3. Zero-result responses are handled safely across queries", async () => {
    const mockProvider = createEmptyMockProvider();
    const engine = new DiscoveryEngine(mockProvider);

    const result = await engine.discover(sampleInput);

    expect(mockProvider.searchCalls.length).toBeLessThanOrEqual(MAX_SEARCH_QUERIES_PER_ANALYSIS);
    expect(result.candidates).toHaveLength(0);
  });

  test("4. 429 response halts further queries immediately without retry storms", async () => {
    const mockProvider = create429MockProvider();
    const engine = new DiscoveryEngine(mockProvider);

    const result = await engine.discover(sampleInput);

    // Stops after the very first 429 query
    expect(mockProvider.searchCalls).toHaveLength(1);
    expect(result.candidates).toHaveLength(0);
    expect(result.queries[0].error).toContain("rate-limit");
  });

  test("5. Returned results pass through downstream candidate processing normally", async () => {
    const { processSearchResults } = await import("../../../services/search/mapper");

    const mockProvider = createMockProvider();
    const engine = new DiscoveryEngine(mockProvider);

    const result = await engine.discover(sampleInput);

    const processedCandidates = processSearchResults(result.candidates);
    expect(processedCandidates.length).toBeGreaterThan(0);

    for (const candidate of processedCandidates) {
      expect(candidate.originalTitle).toBeDefined();
      expect(candidate.metadata).toBeDefined();
      expect(candidate.metadata?.marketplace).toBeDefined();
    }
  });
});
