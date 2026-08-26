import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  DirectMerchantUrlResolver,
  extractRegistrableDomain,
  isUrlOwnedByMerchant,
  isNonProductUrl,
  matchOrganicResultToOffer,
  normalizeMerchantName,
  findMerchantDomainRule
} from "../../directMerchantUrlResolver";
import type { RawProductResult, SearchRequest } from "../../types";

const sampleRequest: SearchRequest = {
  normalizedTitle: "samsung galaxy a17 5g 128gb 6gb ram",
  brand: "samsung",
  model: "galaxy a17",
  category: "Smartphones",
  productType: "Smartphone",
  variant: "128gb",
  color: "black",
  storage: "128gb",
  ram: "6gb",
  fingerprint: "samsung|galaxy a17|128gb|6gb"
};

describe("Phase 4.11.4 — Merchant URL Resolution Coverage Tests", () => {
  let resolver: DirectMerchantUrlResolver;

  beforeEach(() => {
    resolver = new DirectMerchantUrlResolver();
    vi.restoreAllMocks();
  });

  // Test 1: "Co" alone does not trigger fabricated domain resolution.
  test("1. 'Co' alone does not trigger fabricated domain resolution", async () => {
    expect(normalizeMerchantName("Co", "Samsung Galaxy A17 128GB")).toBe("Co");
    expect(findMerchantDomainRule("Co")).toBeNull();
    expect(isUrlOwnedByMerchant("Co", "co.com")).toBe(false);
    expect(isUrlOwnedByMerchant("Co", "co.in")).toBe(false);

    const items: RawProductResult[] = [
      {
        title: "Samsung Galaxy A17 5G 128GB",
        price: 18999,
        currency: "INR",
        url: "",
        source: "Co",
        marketplace: "Co"
      }
    ];

    const mockFetch = vi.fn();
    const result = await resolver.resolveMissingMerchantUrls(items, sampleRequest, "test_api_key", mockFetch);

    expect(result[0].url).toBe("");
    expect(mockFetch).not.toHaveBeenCalled(); // No fabricated search query made
  });

  // Test 2: "Vasanth & Co" resolves using its actual merchant identity/domain when provided by the organic result.
  test("2. 'Vasanth & Co' resolves using its actual merchant identity/domain when provided by the organic result", async () => {
    // Both full merchant name and contextual recovery from title work
    expect(normalizeMerchantName("Vasanth & Co", "Samsung Galaxy A17")).toBe("Vasanth & Co");
    expect(normalizeMerchantName("Co", "Samsung Galaxy A17 at Vasanth & Co")).toBe("Vasanth & Co");

    const rule = findMerchantDomainRule("Vasanth & Co");
    expect(rule).not.toBeNull();
    expect(rule?.domains).toContain("vasanthandco.in");

    const items: RawProductResult[] = [
      {
        title: "Samsung Galaxy A17 5G (Black, 128 GB) at Vasanth & Co",
        price: 18499,
        currency: "INR",
        url: "",
        source: "Co",
        marketplace: "Co"
      }
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        organic: [
          {
            title: "Samsung Galaxy A17 5G Black 128GB - Vasanth & Co",
            link: "https://www.vasanthandco.in/product/samsung-galaxy-a17-5g-128gb",
            snippet: "Buy Samsung Galaxy A17 5G at Vasanth & Co"
          }
        ]
      })
    });

    const result = await resolver.resolveMissingMerchantUrls(items, sampleRequest, "test_api_key", mockFetch);

    expect(result[0].url).toBe("https://www.vasanthandco.in/product/samsung-galaxy-a17-5g-128gb");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // Test 3: Microless accepts: microless.com, india.microless.com, uae.microless.com
  test("3. Microless accepts: microless.com, india.microless.com, uae.microless.com", () => {
    expect(extractRegistrableDomain("microless.com")).toBe("microless.com");
    expect(extractRegistrableDomain("india.microless.com")).toBe("microless.com");
    expect(extractRegistrableDomain("uae.microless.com")).toBe("microless.com");
    expect(extractRegistrableDomain("shop.microless.com")).toBe("microless.com");

    expect(isUrlOwnedByMerchant("Microless", "microless.com")).toBe(true);
    expect(isUrlOwnedByMerchant("Microless", "india.microless.com")).toBe(true);
    expect(isUrlOwnedByMerchant("Microless", "uae.microless.com")).toBe(true);
    expect(isUrlOwnedByMerchant("Microless", "shop.microless.com")).toBe(true);

    // Unrelated domains must still be rejected
    expect(isUrlOwnedByMerchant("Microless", "amazon.in")).toBe(false);
    expect(isUrlOwnedByMerchant("Microless", "microlessdeals.biz")).toBe(false);
  });

  // Test 4: Desertcart accepts: desertcart.in, desertcart.com, desertcart.com.cy
  test("4. Desertcart accepts: desertcart.in, desertcart.com, desertcart.com.cy", () => {
    expect(extractRegistrableDomain("desertcart.in")).toBe("desertcart.in");
    expect(extractRegistrableDomain("desertcart.com")).toBe("desertcart.com");
    expect(extractRegistrableDomain("desertcart.com.cy")).toBe("desertcart.com.cy");
    expect(extractRegistrableDomain("www.desertcart.in")).toBe("desertcart.in");

    expect(isUrlOwnedByMerchant("Desertcart", "desertcart.in")).toBe(true);
    expect(isUrlOwnedByMerchant("Desertcart", "desertcart.com")).toBe(true);
    expect(isUrlOwnedByMerchant("Desertcart", "desertcart.com.cy")).toBe(true);
    expect(isUrlOwnedByMerchant("Desertcart", "india.desertcart.com")).toBe(true);

    // Unrelated domains must still be rejected
    expect(isUrlOwnedByMerchant("Desertcart", "flipkart.com")).toBe(false);
    expect(isUrlOwnedByMerchant("Desertcart", "desert-cart-deals.com")).toBe(false);
  });

  // Test 5: Desertcart product-detail title is accepted while generic category/search page is rejected
  test("5. Desertcart product-detail title is accepted when URL and identity match, while generic category/search page is rejected", () => {
    const offer: RawProductResult = {
      title: "Samsung Galaxy A17 5G 128GB Black",
      price: 19999,
      currency: "INR",
      url: "",
      source: "Desertcart",
      marketplace: "Desertcart"
    };

    // A. Legitimate product detail page with descriptive merchant title
    const legitimateProduct = {
      title: "Buy Samsung Galaxy A17 5G Online at Desertcart India",
      link: "https://www.desertcart.in/products/123456-samsung-galaxy-a17-5g-128gb",
      snippet: "Shop Samsung Galaxy A17 5G with worldwide delivery at Desertcart India."
    };
    expect(isNonProductUrl(legitimateProduct.link, legitimateProduct.title)).toBe(false);
    expect(matchOrganicResultToOffer(offer, legitimateProduct)).toBe(true);

    // B. Category listing page -> REJECTED
    const categoryPage = {
      title: "Category: Samsung Smartphones | Desertcart India",
      link: "https://www.desertcart.in/category/smartphones",
      snippet: "Browse all Samsung smartphones."
    };
    expect(isNonProductUrl(categoryPage.link, categoryPage.title)).toBe(true);
    expect(matchOrganicResultToOffer(offer, categoryPage)).toBe(false);

    // C. Search result page -> REJECTED
    const searchPage = {
      title: "Search results for Samsung Galaxy A17 | Desertcart",
      link: "https://www.desertcart.in/search?q=samsung+galaxy+a17",
      snippet: "Find all products matching your search."
    };
    expect(isNonProductUrl(searchPage.link, searchPage.title)).toBe(true);
    expect(matchOrganicResultToOffer(offer, searchPage)).toBe(false);
  });
});
