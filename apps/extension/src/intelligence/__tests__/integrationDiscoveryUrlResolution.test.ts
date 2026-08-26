import { describe, test, expect, vi } from "vitest";
import { generateSearchQueries } from "../../services/search/queryGenerator";
import { convertToSearchAttributes, enhanceSearchQueryInput } from "../visual/searchAttributes";
import { reconcileVisualIdentity } from "../visual/visualIdentityReconciliation";
import { discoverProductsFromImage } from "../visual/discovery";
import { extractCandidateMerchantUrls, resolveMerchantPurchaseUrlWithDetails } from "../../../../web/server/services/search/providers/SerperGoogleShoppingProvider";
import { directMerchantUrlResolver, isUrlOwnedByMerchant, matchOrganicResultToOffer } from "../../../../web/server/services/search/directMerchantUrlResolver";
import { ProductDomain, inferDomain, areDomainsCompatible } from "../domain";
import { compareProducts } from "../matching";
import { processProduct } from "../engine";
import type { RawProductResult } from "../../services/search/types";

describe("Phase 4.3 Integration Bug Regression Suite — Visual Discovery & Merchant URL Resolution", () => {
  // 1. Visual Shoes + Puma + Electron Street produces Puma/Electron Street query
  test("1. Visual recognition of Puma Electron Street Shoes produces a Puma/Electron Street query", () => {
    const visualResult = {
      status: "success" as const,
      category: "Shoes",
      brand: "Puma",
      model: "Electron Street",
      productType: "Shoes",
      confidence: 0.95,
      visualAttributes: { color: "Black" },
      evidence: []
    };

    const searchAttrs = convertToSearchAttributes(visualResult);
    const queryInput = enhanceSearchQueryInput(searchAttrs);
    const queries = generateSearchQueries(queryInput);

    expect(queries.length).toBeGreaterThan(0);
    const topQuery = queries[0].query;
    expect(topQuery).toContain("Puma");
    expect(topQuery.toLowerCase()).toContain("electron street");
  });

  // 2. No unrelated Adidas/Uncategorized query is generated
  test("2. Sanitized query generator never emits 'adidas Uncategorized' or literal 'Uncategorized'", () => {
    const inputWithUncategorized = {
      title: "",
      brand: "Puma",
      model: "Electron Street",
      category: "Uncategorized"
    };

    const queries = generateSearchQueries(inputWithUncategorized);
    for (const q of queries) {
      expect(q.query).not.toContain("Uncategorized");
      expect(q.query).not.toContain("uncategorized");
      expect(q.query).not.toContain("adidas");
    }
  });

  // 3. Serper link is correctly extracted into candidate URL entry
  test("3. Serper link is extracted into expected candidate URL structure", () => {
    const rawSerperItem = {
      title: "Puma Electron Street Shoes",
      source: "adidas.co.in",
      link: "https://www.google.com/search?ibp=oshop&q=Puma+Electron+Street",
      price: 3499
    };

    const candidates = extractCandidateMerchantUrls(rawSerperItem);
    expect(candidates.some(c => c.field === "link")).toBe(true);
    expect(candidates.find(c => c.field === "link")?.url).toBe(rawSerperItem.link);
  });

  // 4. Merchant URL resolver receives the correct candidate URL
  test("4. Merchant URL resolver receives extracted candidate URL from Serper item", () => {
    const rawSerperItem = {
      title: "Puma Electron Street Shoes",
      source: "puma.com",
      link: "https://www.google.com/search?ibp=oshop&q=Puma+Electron+Street",
      price: 3499
    };

    const details = resolveMerchantPurchaseUrlWithDetails(rawSerperItem);
    expect(details.candidateCount).toBe(1);
    // Since link is a provider host without direct target parameter, initial provider resolution returns null (resolved=false)
    expect(details.url).toBeNull();
  });

  // 5. Successful organic URL resolution sets resolved=true
  test("5. Organic resolution matches direct merchant URL and sets resolved=true", async () => {
    const shoppingOffer: RawProductResult = {
      title: "Puma Electron Street Shoes Black",
      price: 3499,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "",
      source: "Puma",
      marketplace: "Puma"
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [
          {
            title: "Puma Electron Street Running Shoes - Black",
            link: "https://in.puma.com/in/en/pd/electron-street-shoes/192444.html",
            snippet: "Buy Puma Electron Street Running Shoes online."
          }
        ]
      })
    });

    const searchReq = {
      normalizedTitle: "puma electron street shoes",
      brand: "Puma",
      model: "Electron Street",
      category: "Fashion",
      productType: "Shoes",
      variant: null,
      color: null,
      storage: null,
      ram: null,
      fingerprint: "puma|electron street"
    };

    const resolved = await directMerchantUrlResolver.resolveMissingMerchantUrls(
      [shoppingOffer],
      searchReq,
      "dummy-api-key",
      mockFetch as any
    );

    expect(resolved[0].url).toBe("https://in.puma.com/in/en/pd/electron-street-shoes/192444.html");
  });

  // 6. Missing URL remains safely unresolved (url = "") without inventing URLs
  test("6. Unresolvable merchant candidate remains safely unresolved (url = '') without inventing URLs", async () => {
    const shoppingOffer: RawProductResult = {
      title: "Puma Electron Street Shoes",
      price: 3499,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "",
      source: "Unknown Merchant",
      marketplace: "Unknown Merchant"
    };

    const searchReq = {
      normalizedTitle: "puma electron street shoes",
      brand: "Puma",
      model: "Electron Street",
      category: "Fashion",
      productType: "Shoes",
      variant: null,
      color: null,
      storage: null,
      ram: null,
      fingerprint: "puma|electron street"
    };

    const resolved = await directMerchantUrlResolver.resolveMissingMerchantUrls(
      [shoppingOffer],
      searchReq,
      undefined // No API key -> 0 API requests
    );

    expect(resolved[0].url).toBe("");
  });

  // 7. Fashion domain boundary isolation remains active
  test("7. Fashion domain classification and cross-domain hard boundary remain active", () => {
    const shoe = processProduct({ title: "Puma Electron Street Shoes", price: 3499, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });
    const phone = processProduct({ title: "Samsung Galaxy S24 Ultra", price: 120000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    expect(shoe.domain).toBe(ProductDomain.Fashion);
    expect(phone.domain).toBe(ProductDomain.Electronics);
    expect(areDomainsCompatible(shoe.domain, phone.domain)).toBe(false);
    expect(compareProducts(shoe, phone).isMatch).toBe(false);
  });

  // 8. Electronics baseline regression remains unchanged
  test("8. Baseline Electronics identity, fingerprint, and matching continue to function unweakened", () => {
    const s24_1 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const s24_2 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 74999, currency: "INR", image: null, url: "https://flipkart.com/p1", hostname: "flipkart.com" });

    const match = compareProducts(s24_1, s24_2);
    expect(match.isMatch).toBe(true);
    expect(match.decision).toBe("Exact Match");
  });

  // 9. Deterministic execution
  test("9. Pipeline resolution behavior is deterministic across repeated executions", () => {
    const input = { title: "", brand: "Puma", model: "Electron Street", category: "Shoes" };
    const q1 = generateSearchQueries(input);
    const q2 = generateSearchQueries(input);
    expect(q1).toEqual(q2);
  });
});
