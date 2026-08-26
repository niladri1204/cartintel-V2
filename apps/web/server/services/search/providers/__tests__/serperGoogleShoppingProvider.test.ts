import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { SerperGoogleShoppingProvider } from "../SerperGoogleShoppingProvider";
import type { SearchRequest } from "../../types";
import { processSearchResults } from "../../../../../../extension/src/services/search/mapper";
import { classifyCandidateQuality } from "../../../../../../extension/src/intelligence/candidateQuality";

describe("Phase 4.7 — SerperGoogleShoppingProvider Offline Integration Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SERPER_API_KEY: "test_serper_key_12345" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const mockShoppingResponse = {
    searchParameters: {
      q: "OnePlus 15R 256GB",
      gl: "in",
      hl: "en",
      type: "shopping"
    },
    shopping: [
      {
        title: "OnePlus 15R 5G (256 GB, 12 GB RAM)",
        source: "Amazon.in",
        price: "₹59,999",
        extractedPrice: 59999,
        link: "https://www.amazon.in/dp/B0CSZD1S7S",
        imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:1",
        rating: 4.5,
        position: 1
      },
      {
        title: "OnePlus 15R 5G (256 GB, 12 GB RAM)",
        source: "Zepto",
        price: "₹54,099",
        extractedPrice: 54099,
        link: "https://www.google.co.in/url?q=https://zepto.in/p/zepto-15r",
        imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:2",
        rating: 4.3,
        position: 2
      },
      {
        title: "OnePlus 15R 5G 256GB",
        source: "Flipkart",
        price: "₹55,499",
        extractedPrice: 55499,
        link: "https://www.google.com/url?q=https://www.flipkart.com/oneplus-15r/p/itm123",
        imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:3",
        position: 3
      },
      {
        title: "OnePlus 15R 5G 256GB",
        source: "Reliance Digital",
        price: "₹56,000",
        extractedPrice: 56000,
        link: "https://www.reliancedigital.in/oneplus-15r/p/49123",
        position: 4
      },
      {
        title: "OnePlus 15R 5G 256GB",
        source: "Croma",
        price: "₹55,990",
        extractedPrice: 55990,
        link: "https://www.croma.com/oneplus-15r/p/27123",
        position: 5
      },
      {
        title: "OnePlus 15R 5G 256GB",
        source: "Vijay Sales",
        price: "₹56,499",
        extractedPrice: 56499,
        link: "https://www.vijaysales.com/oneplus-15r/p/123",
        position: 6
      },
      {
        title: "OnePlus 15R 5G 256GB",
        source: "MyG",
        price: "₹54,685",
        extractedPrice: 54685,
        link: "https://www.myg.in/oneplus-15r.html",
        position: 7
      },
      {
        title: "OnePlus 15R 5G 256GB Official",
        source: "OnePlus",
        price: "₹59,999",
        extractedPrice: 59999,
        link: "https://www.oneplus.in/15r",
        position: 8
      },
      // Intentionally invalid / accessory / replacement part entries to test downstream quality
      {
        title: "OnePlus 15R Protective Case Cover",
        source: "Amazon.in",
        price: "₹499",
        extractedPrice: 499,
        link: "https://www.amazon.in/dp/B0CASE123",
        position: 9
      },
      {
        title: "OnePlus 15R 5G Battery - ORIGINAL",
        source: "Cellspare",
        price: "₹1,200",
        extractedPrice: 1200,
        link: "https://cellspare.com/oneplus-15r-battery",
        position: 10
      },
      {
        title: "OnePlus 15R LCD Screen Replacement Display",
        source: "Maxbhi",
        price: "₹2,500",
        extractedPrice: 2500,
        link: "https://maxbhi.com/oneplus-15r-lcd",
        position: 11
      }
    ]
  };

  const sampleRequest: SearchRequest = {
    normalizedTitle: "OnePlus 15R 256GB",
    brand: "OnePlus",
    model: "15R",
    category: "Smartphones",
    productType: "Smartphone",
    variant: "256GB",
    color: null,
    storage: "256GB",
    ram: "12GB",
    fingerprint: "oneplus|15r|256gb"
  };

  // Test 1: Serper Shopping response maps correctly to RawProductResult[].
  test("1. Serper Shopping response maps correctly to RawProductResult", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockShoppingResponse
    } as Response);

    const provider = new SerperGoogleShoppingProvider();
    const results = await provider.search(sampleRequest);

    expect(results).toBeDefined();
    // All 11 valid shopping items from the mock response should be mapped
    expect(results).toHaveLength(11);
    expect(results[0].title).toBe("OnePlus 15R 5G (256 GB, 12 GB RAM)");
    expect(results[0].price).toBe(59999);
    expect(results[0].source).toBe("Amazon.in");
  });

  // Test 2: Merchant name and direct product URL are preserved.
  test("2. Merchant name and direct product URL are preserved", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockShoppingResponse
    } as Response);

    const provider = new SerperGoogleShoppingProvider();
    const results = await provider.search(sampleRequest);

    const zeptoItem = results.find(r => r.source === "Zepto");
    const flipkartItem = results.find(r => r.source === "Flipkart");

    expect(zeptoItem).toBeDefined();
    expect(zeptoItem?.url).toBe("https://zepto.in/p/zepto-15r");

    expect(flipkartItem).toBeDefined();
    expect(flipkartItem?.url).toBe("https://www.flipkart.com/oneplus-15r/p/itm123");
  });

  // Test 3: Price and currency map correctly without fabrication.
  test("3. Price and currency map correctly without fabrication", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockShoppingResponse
    } as Response);

    const provider = new SerperGoogleShoppingProvider();
    const results = await provider.search(sampleRequest);

    const amazonItem = results.find(r => r.source === "Amazon.in");
    const myGItem = results.find(r => r.source === "MyG");

    expect(amazonItem?.price).toBe(59999);
    expect(amazonItem?.currency).toBe("INR");

    expect(myGItem?.price).toBe(54685);
    expect(myGItem?.currency).toBe("INR");
  });

  // Test 4: Multiple merchants from the same Shopping response are preserved.
  test("4. Multiple merchants from the same Shopping response are preserved", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockShoppingResponse
    } as Response);

    const provider = new SerperGoogleShoppingProvider();
    const results = await provider.search(sampleRequest);

    const merchants = results.map(r => r.source);
    expect(merchants).toContain("Amazon.in");
    expect(merchants).toContain("Zepto");
    expect(merchants).toContain("Flipkart");
    expect(merchants).toContain("Reliance Digital");
    expect(merchants).toContain("Croma");
    expect(merchants).toContain("Vijay Sales");
    expect(merchants).toContain("MyG");
    expect(merchants).toContain("OnePlus");
  });

  // Test 5: 429/rate-limit response causes zero repeated retries.
  test("5. 429 rate-limit response causes zero repeated retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests"
    } as Response);

    global.fetch = fetchMock;

    const provider = new SerperGoogleShoppingProvider();
    await expect(provider.search(sampleRequest)).rejects.toThrow(/rate-limit/i);

    // Expect fetch to have been called exactly ONCE (zero retries on 429)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Test 6: Existing CartIntel candidateQuality/deduplication pipeline receives mapped Serper results correctly.
  test("6. CandidateQuality and deduplication downstream pipeline receives mapped Serper results correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockShoppingResponse
    } as Response);

    const provider = new SerperGoogleShoppingProvider();
    const rawResults = await provider.search(sampleRequest);

    // Pass mapped Serper results through CartIntel's mapper & candidateQuality pipeline
    const candidates = processSearchResults(rawResults);

    // Verify accessories and replacement parts were filtered downstream
    const titles = candidates.map(c => c.originalTitle);
    expect(titles.some(t => t.includes("Case Cover"))).toBe(false);
    expect(titles.some(t => t.includes("Battery - ORIGINAL"))).toBe(false);
    expect(titles.some(t => t.includes("Screen Replacement"))).toBe(false);

    // Verify main product candidates remain
    expect(candidates.length).toBeGreaterThan(0);
    const candidateMerchants = candidates.map(c => c.metadata.marketplace);
    expect(candidateMerchants).toContain("Amazon");
    expect(candidateMerchants).toContain("Zepto");
  });
});
