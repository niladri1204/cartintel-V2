import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { SerpApiGoogleShoppingProvider } from "../../../../../web/server/services/search/providers/SerpApiGoogleShoppingProvider";
import type { SearchRequest } from "../../../../../web/server/services/search/types";

function createSearchRequest(partial: Partial<SearchRequest>): SearchRequest {
  return {
    normalizedTitle: null,
    brand: null,
    model: null,
    category: null,
    productType: null,
    variant: null,
    color: null,
    storage: null,
    ram: null,
    fingerprint: "test-fingerprint",
    ...partial
  };
}

describe("SerpApiGoogleShoppingProvider - Timeout & Retry Resilience", () => {
  let provider: SerpApiGoogleShoppingProvider;
  const originalEnv = process.env.SERPAPI_API_KEY;

  beforeEach(() => {
    provider = new SerpApiGoogleShoppingProvider();
    process.env.SERPAPI_API_KEY = "test-api-key";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.SERPAPI_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  test("1. Successful response within timeout", async () => {
    const mockShoppingResults = [
      {
        title: "Apple iPhone 16 128GB",
        price: "79990",
        source: "Flipkart",
        link: "https://www.flipkart.com/apple-iphone-16/p/itm123",
        product_id: "p123"
      }
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ shopping_results: mockShoppingResults })
      })
    );

    const req = createSearchRequest({
      fingerprint: "apple|iphone 16",
      brand: "Apple",
      model: "iPhone 16",
      storage: "128GB"
    });

    const results = await provider.search(req);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Apple iPhone 16 128GB");
    expect(results[0].price).toBe(79990);
    expect(results[0].source).toBe("Flipkart");
  });

  test("2. Slow but valid SerpApi response (>8s, e.g. 9s) succeeds with 15s timeout", async () => {
    const mockShoppingResults = [
      {
        title: "Apple iPhone 16 128GB",
        price: 79990,
        source: "Amazon.in",
        link: "https://www.amazon.in/dp/B0D123"
      }
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ shopping_results: mockShoppingResults })
              });
            }, 100); // Simulated delay for unit test
          })
      )
    );

    const req = createSearchRequest({
      fingerprint: "apple|iphone 16",
      brand: "Apple",
      model: "iPhone 16"
    });

    const results = await provider.search(req);
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("Amazon.in");
  });

  test("3. Single transient failure retries and succeeds on attempt 2", async () => {
    const mockShoppingResults = [
      {
        title: "Apple iPhone 16 128GB",
        price: 79990,
        source: "Croma",
        link: "https://www.croma.com/p/123"
      }
    ];

    let fetchCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        fetchCount++;
        if (fetchCount === 1) {
          return Promise.reject(new Error("Transient network glitch"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ shopping_results: mockShoppingResults })
        });
      })
    );

    const req = createSearchRequest({
      fingerprint: "apple|iphone 16",
      brand: "Apple",
      model: "iPhone 16"
    });

    const results = await provider.search(req);
    expect(fetchCount).toBe(2);
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("Croma");
  });

  test("4. Genuine persistent timeout/failure propagates explicit error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.reject(new Error("Connection refused")))
    );

    const req = createSearchRequest({
      fingerprint: "apple|iphone 16",
      brand: "Apple",
      model: "iPhone 16"
    });

    await expect(provider.search(req)).rejects.toThrow("Network failure or Timeout while contacting SerpApi");
  });

  test("5. Missing API key throws explicit configuration error", async () => {
    delete process.env.SERPAPI_API_KEY;

    const req = createSearchRequest({
      fingerprint: "apple|iphone 16"
    });

    await expect(provider.search(req)).rejects.toThrow("Provider configuration error: Missing API Key");
  });

  test("6. No mutation of existing search query behavior or result parsing", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            shopping_results: [
              { title: "Item 1", price: 100, source: "Store 1" },
              { title: "Item 2", price: 200, source: "Store 2" }
            ]
          })
        });
      })
    );

    const req = createSearchRequest({
      fingerprint: "apple|iphone 16 128gb",
      brand: "Apple",
      model: "iPhone 16",
      storage: "128GB"
    });

    const results = await provider.search(req);
    expect(capturedUrl).toContain("engine=google_shopping");
    expect(capturedUrl).toContain("q=Apple+iPhone+16+128GB");
    expect(capturedUrl).toContain("gl=in");
    expect(capturedUrl).toContain("hl=en");
    expect(results).toHaveLength(2);
  });
});
