import { describe, test, expect } from "vitest";
import { ProductDomain, inferDomain, areDomainsCompatible } from "../domain";
import { getEligibleMerchantsForProduct, filterCandidatesByDomain } from "../merchantRegistry";
import { processProduct } from "../engine";
import { compareProducts } from "../matching";
import { buildExplainableRecommendation } from "../decision/decisionExplanation";
import { identifyAlternativeProducts } from "../decision/alternativeProduct";
import type { RecommendationCandidate, RecommendationRequest } from "../recommendationTypes";

describe("Phase 4.3 — Universal Recommendation Intelligence & Domain-Aware Discovery", () => {
  // 1. Domain Inference Across All 7 Domains
  test("1. Domain Inference correctly resolves all 7 supported domains", () => {
    expect(inferDomain("Electronics", "Samsung Galaxy S24 Ultra")).toBe(ProductDomain.Electronics);
    expect(inferDomain("Fashion", "H&M Men Slim Fit Cotton T-Shirt")).toBe(ProductDomain.Fashion);
    expect(inferDomain("Beauty & Personal Care", "Minimalist Niacinamide Face Serum")).toBe(ProductDomain.Beauty);
    expect(inferDomain("Grocery", "Nescafe Instant Coffee Powder 200g")).toBe(ProductDomain.Grocery);
    expect(inferDomain("Furniture", "Solid Wood Study Table Desk")).toBe(ProductDomain.Furniture);
    expect(inferDomain("Books", "Atomic Habits Paperback Novel")).toBe(ProductDomain.Books);
    expect(inferDomain("Uncategorized", "Generic XYZ Widget")).toBe(ProductDomain.General);
    expect(inferDomain(null, null)).toBe(ProductDomain.General);
  });

  // 2. Category & Domain Consistency
  test("2. Processed products carry consistent domain metadata", () => {
    const s24 = processProduct({ title: "Samsung Galaxy S24 Ultra 5G", price: 120000, currency: "INR", image: null, url: "https://amazon.in/dp/1", hostname: "amazon.in" });
    expect(s24.domain).toBe(ProductDomain.Electronics);
    expect(s24.category).toBe("Electronics");
    expect(s24.productType).toBe("Smartphone");
    expect(s24.brand).toBe("samsung");

    const shirt = processProduct({ title: "H&M Men Slim Fit T-Shirt", price: 1499, currency: "INR", image: null, url: "https://myntra.com/p/1", hostname: "myntra.com" });
    expect(shirt.domain).toBe(ProductDomain.Fashion);
    expect(shirt.category).toBe("Fashion");
    expect(["T-Shirt", "Apparel"]).toContain(shirt.productType);
    expect(shirt.brand).toBe("h&m");
  });

  // 3. Merchant Capability Routing
  test("3. Merchant Registry returns domain and category aware discovery capabilities", () => {
    const elecMerchants = getEligibleMerchantsForProduct(ProductDomain.Electronics, "Electronics");
    expect(elecMerchants.map(m => m.name)).toContain("Croma");
    expect(elecMerchants.map(m => m.name)).toContain("Amazon");

    const fashionMerchants = getEligibleMerchantsForProduct(ProductDomain.Fashion, "Fashion");
    expect(fashionMerchants.map(m => m.name)).toContain("Myntra");
    expect(fashionMerchants.map(m => m.name)).toContain("AJIO");
    expect(fashionMerchants.map(m => m.name)).not.toContain("Croma");

    const beautyMerchants = getEligibleMerchantsForProduct(ProductDomain.Beauty, "Beauty & Personal Care");
    expect(beautyMerchants.map(m => m.name)).toContain("Nykaa");
    expect(beautyMerchants.map(m => m.name)).not.toContain("Bookchor");
  });

  // 4. Brand-Specific Discovery Target Routing
  test("4. Brand-specific official stores are prioritized when recognized brand is present", () => {
    const hmMerchants = getEligibleMerchantsForProduct(ProductDomain.Fashion, "Fashion", "H&M");
    expect(hmMerchants.some(m => m.name === "H&M Official Store")).toBe(true);

    const pumaMerchants = getEligibleMerchantsForProduct(ProductDomain.Fashion, "Fashion", "Puma");
    expect(pumaMerchants.some(m => m.name === "Puma Official Store")).toBe(true);

    const samsungMerchants = getEligibleMerchantsForProduct(ProductDomain.Electronics, "Electronics", "Samsung");
    expect(samsungMerchants.some(m => m.name === "Samsung Official Store")).toBe(true);
  });

  // 5. Generic Marketplace Candidate Filtering
  test("5. Multi-domain generic marketplaces filter candidates to prevent domain leakage", () => {
    const candElectronics: RecommendationCandidate = {
      product: processProduct({ title: "Samsung Galaxy S24 256GB", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" }),
      rankingDetails: { finalScore: 90, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 20, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" }
    };

    const candFashion: RecommendationCandidate = {
      product: processProduct({ title: "Levi's Men Slim Fit Denim Jeans", price: 2999, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" }),
      rankingDetails: { finalScore: 85, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 20, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" }
    };

    const mixedPool = [candElectronics, candFashion];

    const elecPool = filterCandidatesByDomain(mixedPool, ProductDomain.Electronics);
    expect(elecPool).toHaveLength(1);
    expect(elecPool[0].product?.domain).toBe(ProductDomain.Electronics);

    const fashionPool = filterCandidatesByDomain(mixedPool, ProductDomain.Fashion);
    expect(fashionPool).toHaveLength(1);
    expect(fashionPool[0].product?.domain).toBe(ProductDomain.Fashion);
  });

  // 6. Cross-Domain Hard Boundary Exclusion
  test("6. Hard domain boundary rejects cross-domain candidates when both domains are reliable", () => {
    const smartphone = processProduct({ title: "Samsung Galaxy S24 Ultra", price: 120000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const tShirt = processProduct({ title: "Puma Men Cotton T-Shirt", price: 1299, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });
    const laptop = processProduct({ title: "Dell XPS 15 Laptop", price: 150000, currency: "INR", image: null, url: "https://amazon.in/p3", hostname: "amazon.in" });
    const shoes = processProduct({ title: "Nike Air Max Shoes", price: 8995, currency: "INR", image: null, url: "https://amazon.in/p4", hostname: "amazon.in" });
    const serum = processProduct({ title: "Niacinamide Face Serum", price: 599, currency: "INR", image: null, url: "https://amazon.in/p5", hostname: "amazon.in" });
    const grocery = processProduct({ title: "Basmati Rice 5kg", price: 450, currency: "INR", image: null, url: "https://amazon.in/p6", hostname: "amazon.in" });
    const table = processProduct({ title: "Wooden Office Study Table", price: 8999, currency: "INR", image: null, url: "https://amazon.in/p7", hostname: "amazon.in" });
    const book = processProduct({ title: "Atomic Habits Book", price: 499, currency: "INR", image: null, url: "https://amazon.in/p8", hostname: "amazon.in" });

    expect(compareProducts(smartphone, tShirt).isMatch).toBe(false);
    expect(compareProducts(laptop, shoes).isMatch).toBe(false);
    expect(compareProducts(serum, grocery).isMatch).toBe(false);
    expect(compareProducts(table, smartphone).isMatch).toBe(false);
    expect(compareProducts(book, smartphone).isMatch).toBe(false);
  });

  // 7. General/Unknown Fallback Behavior
  test("7. General or Unknown domain does NOT cause automatic hard rejection", () => {
    expect(areDomainsCompatible(ProductDomain.Electronics, ProductDomain.General)).toBe(true);
    expect(areDomainsCompatible(ProductDomain.Fashion, ProductDomain.General)).toBe(true);
    expect(areDomainsCompatible(ProductDomain.Electronics, null)).toBe(true);
  });

  // 8. Same-Domain Incompatible Product Types Separation
  test("8. Incompatible product types within the same domain return No Match", () => {
    const phone = processProduct({ title: "Apple iPhone 15 Pro", price: 130000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const watch = processProduct({ title: "Apple Watch Series 9 Smartwatch", price: 41900, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });
    const tv = processProduct({ title: "Sony Bravia 55 inch OLED TV", price: 140000, currency: "INR", image: null, url: "https://amazon.in/p3", hostname: "amazon.in" });

    const matchPhoneWatch = compareProducts(phone, watch);
    expect(matchPhoneWatch.isMatch).toBe(false);
    expect(matchPhoneWatch.decision).toBe("No Match");

    const matchPhoneTv = compareProducts(phone, tv);
    expect(matchPhoneTv.isMatch).toBe(false);
    expect(matchPhoneTv.decision).toBe("No Match");
  });

  // 9. Domain-Isolated Alternative Recommendations
  test("9. Alternative products remain strictly within the target product domain and compatible type", () => {
    const recPhone = processProduct({ title: "Samsung Galaxy S24 Ultra 256GB", price: 120000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const altPhone = processProduct({ title: "Google Pixel 8 Pro 256GB", price: 106000, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });
    const altShirt = processProduct({ title: "Puma Cotton T-Shirt", price: 1499, currency: "INR", image: null, url: "https://amazon.in/p3", hostname: "amazon.in" });

    const candidates: RecommendationCandidate[] = [
      { product: recPhone, rankingDetails: { finalScore: 95, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 15, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } },
      { product: altPhone, rankingDetails: { finalScore: 90, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 10, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 90, explanation: "ok" } },
      { product: altShirt, rankingDetails: { finalScore: 85, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 5, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 80, explanation: "ok" } }
    ];

    const req: RecommendationRequest = {
      userPreferences: [{ key: "brand_loyalty", value: "samsung" }],
      candidates
    };

    const alternatives = identifyAlternativeProducts(req);
    expect(alternatives.alternatives).toHaveLength(1);
    expect(alternatives.alternatives[0].product.domain).toBe(ProductDomain.Electronics);
    expect(alternatives.alternatives[0].product.fingerprint).toBe(altPhone.fingerprint);
  });

  // 10. Scenario 1 — Smartphone
  test("10. Universal Recommendation Scenario 1 — Smartphone", () => {
    const p1 = processProduct({ title: "Samsung Galaxy S24 Ultra 256GB", price: 120000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const p2 = processProduct({ title: "Samsung Galaxy S24 Ultra 256GB", price: 115000, currency: "INR", image: null, url: "https://croma.com/p1", hostname: "croma.com" });

    const candidates = [
      { product: p1, rankingDetails: { finalScore: 90, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 10, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 80, explanation: "ok" } },
      { product: p2, rankingDetails: { finalScore: 95, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 15, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res = buildExplainableRecommendation(req, candidates);
    expect(res.recommendedCandidate).toBeDefined();
    expect(res.recommendedCandidate?.product?.originalPrice).toBe(115000);
  });

  // 11. Scenario 2 — H&M T-Shirt
  test("11. Universal Recommendation Scenario 2 — H&M T-Shirt", () => {
    const shirt1 = processProduct({ title: "H&M Men Regular Fit Cotton T-Shirt Black", price: 999, currency: "INR", image: null, url: "https://myntra.com/p1", hostname: "myntra.com" });
    const shirt2 = processProduct({ title: "H&M Men Regular Fit Cotton T-Shirt Black", price: 799, currency: "INR", image: null, url: "https://hm.com/p1", hostname: "hm.com" });

    const candidates = [
      { product: shirt1, rankingDetails: { finalScore: 88, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 8, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 80, explanation: "ok" } },
      { product: shirt2, rankingDetails: { finalScore: 94, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 14, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res = buildExplainableRecommendation(req, candidates);
    expect(res.recommendedCandidate?.product?.domain).toBe(ProductDomain.Fashion);
    expect(res.recommendedCandidate?.product?.originalPrice).toBe(799);
  });

  // 12. Scenario 3 — Puma Shoes
  test("12. Universal Recommendation Scenario 3 — Puma Shoes", () => {
    const shoe = processProduct({ title: "Puma Nitro Velocity Running Shoes White Size 9", price: 5999, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });

    const candidates = [
      { product: shoe, rankingDetails: { finalScore: 92, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 12, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res = buildExplainableRecommendation(req, candidates);
    expect(res.recommendedCandidate?.product?.domain).toBe(ProductDomain.Fashion);
    expect(res.recommendedCandidate?.product?.brand).toBe("puma");
  });

  // 13. Scenario 4 — Beauty & Skincare Product
  test("13. Universal Recommendation Scenario 4 — Beauty Product", () => {
    const serum = processProduct({ title: "Minimalist 10% Niacinamide Face Serum 30ml", price: 599, currency: "INR", image: null, url: "https://nykaa.com/p1", hostname: "nykaa.com" });

    const candidates = [
      { product: serum, rankingDetails: { finalScore: 90, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 10, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res = buildExplainableRecommendation(req, candidates);
    expect(res.recommendedCandidate?.product?.domain).toBe(ProductDomain.Beauty);
  });

  // 14. Scenario 5 — Grocery Product
  test("14. Universal Recommendation Scenario 5 — Grocery Product", () => {
    const coffee = processProduct({ title: "Nescafe Classic Instant Coffee Powder 200g Jar", price: 625, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });

    const candidates = [
      { product: coffee, rankingDetails: { finalScore: 91, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 11, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res = buildExplainableRecommendation(req, candidates);
    expect(res.recommendedCandidate?.product?.domain).toBe(ProductDomain.Grocery);
  });

  // 15. Scenario 6 — Furniture Product
  test("15. Universal Recommendation Scenario 6 — Furniture Product", () => {
    const table = processProduct({ title: "Solid Wood Study Table Computer Desk Brown", price: 8999, currency: "INR", image: null, url: "https://pepperfry.com/p1", hostname: "pepperfry.com" });

    const candidates = [
      { product: table, rankingDetails: { finalScore: 89, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 9, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res = buildExplainableRecommendation(req, candidates);
    expect(res.recommendedCandidate?.product?.domain).toBe(ProductDomain.Furniture);
  });

  // 16. Scenario 7 — Book Product
  test("16. Universal Recommendation Scenario 7 — Book Product", () => {
    const book = processProduct({ title: "Atomic Habits by James Clear Paperback Book", price: 499, currency: "INR", image: null, url: "https://bookchor.com/p1", hostname: "bookchor.com" });

    const candidates = [
      { product: book, rankingDetails: { finalScore: 93, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 13, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res = buildExplainableRecommendation(req, candidates);
    expect(res.recommendedCandidate?.product?.domain).toBe(ProductDomain.Books);
  });

  // 17. Electronics Regression Baseline Protection
  test("17. Baseline Electronics identity, fingerprint, and matching continue to function unweakened", () => {
    const s24_1 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const s24_2 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 74999, currency: "INR", image: null, url: "https://flipkart.com/p1", hostname: "flipkart.com" });

    const match = compareProducts(s24_1, s24_2);
    expect(match.isMatch).toBe(true);
    expect(match.decision).toBe("Exact Match");
    expect(s24_1.fingerprint).toBe(s24_2.fingerprint);
  });

  // 18. Deterministic Repeated Execution
  test("18. Pipeline produces deterministic results across repeated executions", () => {
    const p1 = processProduct({ title: "Apple iPhone 16 Pro Max 256GB", price: 144900, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    const candidates = [
      { product: p1, rankingDetails: { finalScore: 95, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 15, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res1 = buildExplainableRecommendation(req, candidates);
    const res2 = buildExplainableRecommendation(req, candidates);
    res1.metadata.executionTimeMs = 0;
    res2.metadata.executionTimeMs = 0;
    res1.metadata.processedAt = 0;
    res2.metadata.processedAt = 0;
    expect(res1).toEqual(res2);
  });

  // 19. Input Immutability
  test("19. Input requests and product objects remain unmutated", () => {
    const p1 = processProduct({ title: "Nike Air Max Shoes", price: 7995, currency: "INR", image: null, url: "https://nike.com/p1", hostname: "nike.com" });
    const copyP1 = JSON.parse(JSON.stringify(p1));

    const candidates = [
      { product: p1, rankingDetails: { finalScore: 90, rankingTier: "exact_identity_tier", identityContribution: 50, qualityContribution: 20, priceAvailabilityContribution: 10, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 100, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const copyReq = JSON.parse(JSON.stringify(req));

    buildExplainableRecommendation(req, candidates);
    expect(p1).toEqual(copyP1);
    expect(req).toEqual(copyReq);
  });

  // 20. Missing Data Safety
  test("20. Missing domain, category, or brand data handled safely without throwing exceptions", () => {
    const sparse = processProduct({ title: "Unbranded Item 123", price: 100, currency: "INR", image: null, url: null });
    expect(sparse.domain).toBe(ProductDomain.General);
    expect(sparse.brand).toBeNull();

    const candidates = [
      { product: sparse, rankingDetails: { finalScore: 50, rankingTier: "compatible_identity_tier", identityContribution: 20, qualityContribution: 10, priceAvailabilityContribution: 10, priceCompetitivenessContribution: 10, duplicatePenalty: 0, priceCompetitivenessScore: 50, explanation: "ok" } }
    ];

    const req: RecommendationRequest = { candidates };
    const res = buildExplainableRecommendation(req, candidates);
    expect(res.recommendedCandidate).toBeDefined();
  });
});
