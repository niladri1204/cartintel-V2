/**
 * Phase 4.10.1 — Restore Valid Serper Merchant CTA URLs Tests
 *
 * All tests are OFFLINE — zero network calls.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveMerchantPurchaseUrl,
  SerperGoogleShoppingProvider,
} from "../SerperGoogleShoppingProvider";
import type { SearchRequest } from "../../types";

function makeResult(overrides: Record<string, unknown>) {
  return {
    title: "Test Product",
    source: "Test Store",
    price: "₹10,000",
    extractedPrice: 10000,
    ...overrides,
  };
}

const sampleRequest: SearchRequest = {
  normalizedTitle: "Samsung Galaxy A17 5G",
  brand: "Samsung",
  model: "Galaxy A17 5G",
  category: "Smartphones",
  productType: "Smartphone",
  variant: "128GB",
  color: null,
  storage: "128GB",
  ram: "6GB",
  fingerprint: "samsung|galaxy a17 5g|128gb",
};

describe("Phase 4.10.1 — Restore Valid Serper Merchant CTA URLs", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SERPER_API_KEY: "test_serper_key_12345" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // Test 1: Serper `link` containing a direct Flipkart URL produces non-empty RawProductResult.url
  test("1. Serper link containing a direct Flipkart URL produces non-empty RawProductResult.url", async () => {
    const flipkartUrl =
      "https://www.flipkart.com/samsung-galaxy-a17-5g-black-128-gb/p/itm123456";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        shopping: [
          {
            title: "Samsung Galaxy A17 5G (128 GB)",
            source: "Flipkart",
            price: "₹23,998",
            extractedPrice: 23998,
            link: flipkartUrl,
          },
        ],
      }),
    } as Response);

    const provider = new SerperGoogleShoppingProvider();
    const results = await provider.search(sampleRequest);

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe(flipkartUrl);
    expect(results[0].url).not.toBe("");
  });

  // Test 2: Serper `link` containing a direct Amazon URL produces non-empty RawProductResult.url
  test("2. Serper link containing a direct Amazon URL produces non-empty RawProductResult.url", async () => {
    const amazonUrl = "https://www.amazon.in/dp/B0CSZD1S7S";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        shopping: [
          {
            title: "Samsung Galaxy A17 5G (128 GB)",
            source: "Amazon.in",
            price: "₹24,499",
            extractedPrice: 24499,
            link: amazonUrl,
          },
        ],
      }),
    } as Response);

    const provider = new SerperGoogleShoppingProvider();
    const results = await provider.search(sampleRequest);

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe(amazonUrl);
    expect(results[0].url).not.toBe("");
  });

  // Test 3: Google.co.in redirect containing a Flipkart destination resolves to Flipkart
  test("3. Google.co.in redirect containing a Flipkart destination resolves to Flipkart", () => {
    const redirectResult = makeResult({
      link: "https://www.google.co.in/url?q=https://www.flipkart.com/pixel-9a/p/itm123&sa=U",
    });
    const resolved = resolveMerchantPurchaseUrl(redirectResult);
    expect(resolved).toBe("https://www.flipkart.com/pixel-9a/p/itm123");
  });

  // Test 4: A Google Shopping URL with no extractable merchant destination returns null
  test("4. A Google Shopping URL with no extractable merchant destination returns null", () => {
    const googleShoppingResult = makeResult({
      link: "https://shopping.google.com/product/1234567890",
    });
    expect(resolveMerchantPurchaseUrl(googleShoppingResult)).toBeNull();

    const googleSearchResult = makeResult({
      link: "https://www.google.com/search?tbm=shop&q=samsung+a17",
    });
    expect(resolveMerchantPurchaseUrl(googleSearchResult)).toBeNull();
  });

  // Test 5: Different merchant domains remain unchanged and deterministic
  test("5. Different merchant domains remain unchanged and deterministic", () => {
    const merchants: Array<[string, string]> = [
      ["Amazon", "https://www.amazon.in/dp/B0CSZD1S7S"],
      ["Croma", "https://www.croma.com/samsung-galaxy-a17/p/271001"],
      ["Reliance Digital", "https://www.reliancedigital.in/samsung-galaxy-a17/p/49152"],
      ["Vijay Sales", "https://www.vijaysales.com/samsung-galaxy-a17/p/1234"],
      ["JioMart", "https://www.jiomart.com/p/samsung-galaxy-a17/1234567"],
      ["OnePlus", "https://www.oneplus.in/phone/15r"],
      ["Zepto", "https://zepto.in/p/samsung-a17"],
      ["MyG", "https://www.myg.in/samsung-a17.html"],
      ["Google Store", "https://store.google.com/product/pixel_10a"],
    ];

    for (const [name, url] of merchants) {
      const item = makeResult({ link: url });
      const resolved1 = resolveMerchantPurchaseUrl(item);
      const resolved2 = resolveMerchantPurchaseUrl(item);

      expect(resolved1, `Expected ${name} URL to be preserved`).toBe(url);
      expect(resolved2, `Expected deterministic resolution for ${name}`).toBe(resolved1);
    }
  });
});

