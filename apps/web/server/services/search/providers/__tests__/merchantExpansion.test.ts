import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SerpApiGoogleShoppingProvider,
  normalizeMerchantName,
  classifyMerchant
} from "../SerpApiGoogleShoppingProvider";
import type { SearchRequest } from "../../types";

describe("Merchant Expansion and Fair Selection Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SERPAPI_API_KEY: "mock-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // Test 1: Exact Google Shopping result with product_id triggers ONE seller expansion request
  test("1. Exact Google Shopping result with product_id triggers ONE seller expansion request", async () => {
    const provider = new SerpApiGoogleShoppingProvider();
    const request: SearchRequest = {
      normalizedTitle: "Samsung Galaxy S24 Ultra",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      category: "Smartphones",
      productType: "Smartphone",
      variant: null,
      color: null,
      storage: null,
      ram: null,
      fingerprint: "samsung|galaxy s24 ultra"
    };

    const mockShoppingResponse = {
      shopping_results: [
        {
          title: "Samsung Galaxy S24 Ultra 5G",
          price: "₹1,24,999.00",
          extracted_price: 124999,
          currency: "INR",
          link: "https://www.google.com/url?url=https://www.samsung.com/in/",
          direct_link: "https://www.samsung.com/in/",
          source: "Samsung Store",
          product_id: "12345",
          immersive_product_page_token: "token123"
        }
      ]
    };

    const mockSellersResponse = {
      sellers_results: {
        online_sellers: [
          {
            name: "Amazon",
            extracted_price: 121999,
            link: "https://www.amazon.in/dp/B0CSZD1S7S",
            direct_link: "https://www.amazon.in/dp/B0CSZD1S7S"
          }
        ]
      }
    };

    // Mock fetch to return shopping results on first call, and seller results on subsequent call
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      callCount++;
      const resData = url.includes("product_id=12345") || url.includes("page_token=token123")
        ? mockSellersResponse
        : mockShoppingResponse;

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(resData)
      } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await provider.search(request);

    // Assert that we called fetch exactly twice (1 for shopping search, 1 for seller expansion)
    expect(callCount).toBe(2);
    // Verified seller expansion fetch call count <= 1
    const sellerCalls = fetchMock.mock.calls.filter(args => args[0].includes("product_id=12345"));
    expect(sellerCalls.length).toBeLessThanOrEqual(1);

    // Merge check: both shopping result and seller result should be present
    expect(results).toHaveLength(2);
    expect(results[0].source).toBe("Samsung Store");
    expect(results[1].source).toBe("Amazon");
  });

  // Test 2: Seller results from Amazon, Flipkart, Reliance Digital, Croma and Vijay Sales are merged
  test("2. Seller results from major retailers are merged", async () => {
    const provider = new SerpApiGoogleShoppingProvider();
    const request: SearchRequest = {
      normalizedTitle: "Samsung Galaxy S24 Ultra",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      category: "Smartphones",
      productType: "Smartphone",
      variant: null,
      color: null,
      storage: null,
      ram: null,
      fingerprint: "samsung|galaxy s24 ultra"
    };

    const mockShoppingResponse = {
      shopping_results: [
        {
          title: "Samsung Galaxy S24 Ultra",
          price: "₹1,24,999.00",
          extracted_price: 124999,
          currency: "INR",
          link: "https://www.google.com/url?url=https://www.samsung.com/in/",
          direct_link: "https://www.samsung.com/in/",
          source: "Samsung",
          product_id: "12345"
        }
      ]
    };

    const mockSellersResponse = {
      sellers_results: {
        online_sellers: [
          { name: "Amazon", extracted_price: 121000, link: "https://amazon.in/p", direct_link: "https://amazon.in/p" },
          { name: "Flipkart", extracted_price: 122000, link: "https://flipkart.com/p", direct_link: "https://flipkart.com/p" },
          { name: "Reliance Digital", extracted_price: 123000, link: "https://reliancedigital.in/p", direct_link: "https://reliancedigital.in/p" },
          { name: "Croma", extracted_price: 124000, link: "https://croma.com/p", direct_link: "https://croma.com/p" },
          { name: "Vijay Sales", extracted_price: 124500, link: "https://vijaysales.com/p", direct_link: "https://vijaysales.com/p" }
        ]
      }
    };

    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      const resData = url.includes("product_id=12345") ? mockSellersResponse : mockShoppingResponse;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(resData)
      } as Response);
    }));

    const results = await provider.search(request);
    
    // Check that we merged all 5 retailers + 1 original shopping result = 6 total
    expect(results).toHaveLength(6);
    const sources = results.map(r => r.source);
    expect(sources).toContain("Amazon");
    expect(sources).toContain("Flipkart");
    expect(sources).toContain("Reliance Digital");
    expect(sources).toContain("Croma");
    expect(sources).toContain("Vijay Sales");
  });

  // Test 3: Seller expansion is limited to ONE immersive request
  test("3. Seller expansion is limited to ONE immersive request", async () => {
    const provider = new SerpApiGoogleShoppingProvider();
    const request: SearchRequest = {
      normalizedTitle: "Samsung S24",
      brand: "Samsung",
      model: "S24",
      category: "Smartphones",
      productType: "Smartphone",
      variant: null,
      color: null,
      storage: null,
      ram: null,
      fingerprint: "samsung|s24"
    };

    // Immersive path mock for request with useSellerExpansion = true
    const mockSellersResponse = {
      sellers_results: {
        online_sellers: [
          { name: "Amazon", extracted_price: 74999, link: "https://amazon.in/p", direct_link: "https://amazon.in/p" }
        ]
      },
      serpapi_pagination: {
        next_page_token: "should-not-be-requested-because-maxPages-is-1-for-expansion"
      }
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockSellersResponse)
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    // Call provider with direct product_id and useSellerExpansion = true
    const results = await provider.search({
      ...request,
      googleProductId: "12345",
      useSellerExpansion: true
    });

    // Verify it requested exactly 1 page (fetch call count is 1)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  });

  // Test 4: Failed seller expansion falls back safely to normal shopping results
  test("4. Failed seller expansion falls back safely to normal shopping results", async () => {
    const provider = new SerpApiGoogleShoppingProvider();
    const request: SearchRequest = {
      normalizedTitle: "Samsung Galaxy S24 Ultra",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      category: "Smartphones",
      productType: "Smartphone",
      variant: null,
      color: null,
      storage: null,
      ram: null,
      fingerprint: "samsung|galaxy s24 ultra"
    };

    const mockShoppingResponse = {
      shopping_results: [
        {
          title: "Samsung Galaxy S24 Ultra",
          price: "₹1,24,999.00",
          extracted_price: 124999,
          currency: "INR",
          link: "https://www.samsung.com/in/",
          direct_link: "https://www.samsung.com/in/",
          source: "Samsung",
          product_id: "12345"
        }
      ]
    };

    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("product_id=12345")) {
        // Mock seller expansion failure
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error"
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockShoppingResponse)
      } as Response);
    }));

    const results = await provider.search(request);
    
    // Even though seller expansion failed, we should successfully fall back and get the original shopping result
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("Samsung");
  });

  // Test 5: Merchant classification correctly identifies manufacturer, trusted retailer and unknown merchant
  test("5. Merchant classification correctly identifies classes", () => {
    expect(classifyMerchant("Samsung Store")).toBe("manufacturer");
    expect(classifyMerchant("Apple India")).toBe("manufacturer");
    expect(classifyMerchant("Google Store")).toBe("manufacturer");

    expect(classifyMerchant("Amazon.in")).toBe("trusted_retailer");
    expect(classifyMerchant("Reliance Digital")).toBe("trusted_retailer");
    expect(classifyMerchant("Flipkart Online")).toBe("trusted_retailer");
    expect(classifyMerchant("Croma Electronics")).toBe("trusted_retailer");
    expect(classifyMerchant("Vijay Sales")).toBe("trusted_retailer");

    expect(classifyMerchant("Some Random Seller")).toBe("unknown");
    expect(classifyMerchant(null)).toBe("unknown");
  });

  // Test 6: Determinism + URL preservation:
  // - identical input gives identical output
  // - merchant URLs are preserved exactly
  // - no URL is synthesized
  // - input request remains unmutated
  test("6. Determinism, URL preservation and request immutability", async () => {
    const provider = new SerpApiGoogleShoppingProvider();
    const request: SearchRequest = {
      normalizedTitle: "Samsung Galaxy S24 Ultra",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      category: "Smartphones",
      productType: "Smartphone",
      variant: null,
      color: null,
      storage: null,
      ram: null,
      fingerprint: "samsung|galaxy s24 ultra"
    };

    const mockShoppingResponse = {
      shopping_results: [
        {
          title: "Samsung Galaxy S24 Ultra",
          price: "₹1,24,999.00",
          extracted_price: 124999,
          currency: "INR",
          link: "https://www.samsung.com/in/exact-url",
          direct_link: "https://www.samsung.com/in/exact-url",
          source: "Samsung"
        }
      ]
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockShoppingResponse)
    } as Response));

    const requestCopy = JSON.parse(JSON.stringify(request));

    const results1 = await provider.search(request);
    const results2 = await provider.search(request);

    // Immutability Check
    expect(request).toEqual(requestCopy);

    // Determinism Check
    expect(results1).toEqual(results2);

    // URL Preservation Check: link should match exactly
    expect(results1[0].url).toBe("https://www.samsung.com/in/exact-url");
  });
});
