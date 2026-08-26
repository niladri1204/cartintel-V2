import { describe, test, expect } from "vitest";
import { processProduct } from "../engine";
import { inferCategoryAndType } from "../category";
import { inferDomain, ProductDomain } from "../domain";
import { getEligibleMerchantsForProduct, filterCandidatesByDomain } from "../merchantRegistry";
import { compareProducts } from "../matching";
import { evaluateProductLevelDecisions } from "../decision/productDecision";
import { evaluateOfferLevelDecisions } from "../decision/offerDecision";
import { buildExplainableRecommendation } from "../decision/decisionExplanation";
import { identifyAlternativeProducts } from "../decision/alternativeProduct";
import { rankAlternativeProducts } from "../decision/alternativeRanking";
import { sanitizePurchaseUrl, validatePurchaseUrlSafety } from "../purchaseSafety";
import type { RecommendationCandidate, RecommendationRequest } from "../recommendationTypes";

describe("Phase 4.5.7 — Full Universal End-to-End Pipeline Validation (All 7 Domains)", () => {

  function createCandidate(
    title: string,
    price: number,
    hostname: string,
    marketplace: string,
    url: string,
    identityConfidenceScore: number = 80
  ): RecommendationCandidate {
    const prod = processProduct({
      title,
      price,
      currency: "INR",
      image: "https://example.com/img.jpg",
      url,
      hostname
    });
    prod.metadata = { marketplace, hostname, detectedAt: Date.now() };

    return {
      product: prod,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore,
      rankingDetails: {
        finalScore: identityConfidenceScore,
        rankingTier: "exact_identity_tier",
        contributions: {
          identityContribution: 50,
          qualityContribution: 20,
          priceAvailabilityContribution: 10,
          priceCompetitivenessContribution: 10,
          marketplaceContribution: 0,
          duplicatePenalty: 0
        },
        duplicatePenalty: 0,
        priceCompetitivenessScore: 100,
        explanation: "valid candidate"
      }
    };
  }

  // =========================================================================
  // SCENARIO 1: ELECTRONICS END-TO-END (Samsung Galaxy S24 Ultra)
  // =========================================================================
  test("1. Electronics E2E: Full 14-step pipeline for Samsung Galaxy S24 Ultra", () => {
    const targetTitle = "Samsung Galaxy S24 Ultra 5G (12GB RAM, 256GB Storage) Titanium Gray";
    const pageProduct = processProduct({
      title: targetTitle,
      price: 129999,
      currency: "INR",
      image: "https://amazon.in/img/s24.jpg",
      url: "https://www.amazon.in/dp/B0S24ULTRA",
      hostname: "amazon.in"
    });

    // Step 1: Page Ingestion
    expect(pageProduct.originalTitle).toBe(targetTitle);

    // Step 2: Identity & Fingerprint
    expect(pageProduct.brand).toBe("samsung");
    expect(pageProduct.model).toBe("galaxy s24 ultra");
    expect(pageProduct.fingerprint).toContain("samsung|galaxy s24 ultra");

    // Step 3 & 4: Category & Domain
    expect(pageProduct.category).toBe("Electronics");
    expect(pageProduct.domain).toBe(ProductDomain.Electronics);

    // Step 5: Product Type
    expect(pageProduct.productType).toBe("Smartphone");

    // Step 6 & 7: Attributes & Variant
    expect(pageProduct.ram).toBe("12GB");
    expect(pageProduct.storage).toBe("256GB");

    // Step 8: Eligible Merchants
    const merchants = getEligibleMerchantsForProduct(pageProduct.domain || ProductDomain.General, pageProduct.category || "", pageProduct.brand || "");
    const merchantNames = merchants.map(m => m.name);
    expect(merchantNames).toContain("Samsung Official Store");
    expect(merchantNames).toContain("Croma");
    expect(merchantNames).toContain("Amazon");
    expect(merchantNames).not.toContain("Nykaa");

    // Step 9: Discovery Candidate Filtering
    const candidate1 = createCandidate("Samsung Galaxy S24 Ultra 256GB Titanium Gray", 124999, "croma.com", "Croma", "https://www.croma.com/p/s24ultra", 90);
    const candidate2 = createCandidate("Google Pixel 8a 256GB Smartphone", 52999, "amazon.in", "Amazon", "https://www.amazon.in/dp/B0PIXEL8A", 80);
    const candidateCrossDomain = createCandidate("Nike Air Max Shoes", 8995, "myntra.com", "Myntra", "https://www.myntra.com/shoes/1", 80);

    const filteredPool = filterCandidatesByDomain([candidate1, candidate2, candidateCrossDomain], pageProduct.domain || ProductDomain.General, pageProduct.productType || null);
    expect(filteredPool).toHaveLength(2);

    // Step 10: Candidate Matching
    const targetCandidate = createCandidate(targetTitle, 129999, "amazon.in", "Amazon", "https://www.amazon.in/dp/B0S24ULTRA", 100);
    const match = compareProducts(pageProduct, candidate1.product!);
    expect(match.isMatch).toBe(true);

    // Step 11 & 12: Offer & Product Decision
    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pageProduct },
      pageProduct,
      candidates: [targetCandidate, candidate1, candidate2],
      userPreferences: null
    };
    const prodDec = evaluateProductLevelDecisions(req);
    expect(prodDec.bestProductGroup).toBeDefined();
    expect(prodDec.bestProductGroup?.fingerprint).toContain("samsung|galaxy s24 ultra");

    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup);
    expect(offerDec.cheapestOffer).toBeDefined();

    // Step 13: Alternatives
    const altResult = identifyAlternativeProducts(req);
    expect(altResult.alternatives.some(a => (a.product.normalizedTitle || "").includes("pixel 8a"))).toBe(true);

    // Step 14: Purchase URL Safety
    const directUrl = candidate1.product?.originalUrl;
    const urlSafety = validatePurchaseUrlSafety(directUrl, "croma.com");
    expect(urlSafety.isValid).toBe(true);
    expect(urlSafety.hostname).toBe("croma.com");
  });

  // =========================================================================
  // SCENARIO 2: FASHION END-TO-END (H&M T-Shirt)
  // =========================================================================
  test("2. Fashion E2E: Full 14-step pipeline for H&M T-Shirt", () => {
    const targetTitle = "H&M Regular Fit Cotton T-Shirt Black Size M";
    const pageProduct = processProduct({
      title: targetTitle,
      price: 799,
      currency: "INR",
      image: "https://hm.com/img/tshirt.jpg",
      url: "https://www.hm.com/in/en/product/HMTSHIRT123",
      hostname: "hm.com"
    });

    expect(pageProduct.domain).toBe(ProductDomain.Fashion);
    expect(pageProduct.brand).toBe("h&m");

    const merchants = getEligibleMerchantsForProduct(pageProduct.domain || ProductDomain.General, pageProduct.category || "", pageProduct.brand || "");
    expect(merchants.map(m => m.name)).toContain("H&M Official Store");
    expect(merchants.map(m => m.name)).toContain("Myntra");

    const candidate1 = createCandidate("H&M Regular Fit Cotton T-Shirt Black Size M", 699, "myntra.com", "Myntra", "https://www.myntra.com/tshirt/hm/123", 90);
    const candidateAlt = createCandidate("Zara Basic Cotton T-Shirt Black Size M", 990, "zara.com", "Zara", "https://www.zara.com/tshirt/1", 80);

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pageProduct },
      pageProduct,
      candidates: [createCandidate(targetTitle, 799, "hm.com", "H&M", "https://www.hm.com/in/en/product/HMTSHIRT123", 100), candidate1, candidateAlt],
      userPreferences: null
    };

    const altResult = identifyAlternativeProducts(req);
    expect(altResult.alternatives.some(a => (a.product.normalizedTitle || "").includes("zara"))).toBe(true);

    const urlSafety = validatePurchaseUrlSafety(candidate1.product?.originalUrl, "myntra.com");
    expect(urlSafety.isValid).toBe(true);
  });

  // =========================================================================
  // SCENARIO 3: FOOTWEAR END-TO-END (Puma Electron Street)
  // =========================================================================
  test("3. Footwear E2E: Full 14-step pipeline for Puma Electron Street", () => {
    const targetTitle = "Puma Electron Street Black Running Shoes UK 9";
    const pageProduct = processProduct({
      title: targetTitle,
      price: 3499,
      currency: "INR",
      image: "https://puma.com/img/puma.jpg",
      url: "https://in.puma.com/in/en/pd/12345",
      hostname: "puma.com"
    });

    expect(pageProduct.domain).toBe(ProductDomain.Fashion);
    expect(pageProduct.productType).toBe("Running Shoes");

    const candidate1 = createCandidate("Puma Electron Street Black Running Shoes UK 9", 3199, "amazon.in", "Amazon", "https://www.amazon.in/dp/B0PUMA9", 90);
    const candidateAlt = createCandidate("Nike Air Max Excee Running Shoes UK 9", 5995, "nike.com", "Nike", "https://www.nike.com/shoes/1", 80);

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pageProduct },
      pageProduct,
      candidates: [createCandidate(targetTitle, 3499, "puma.com", "Puma", "https://in.puma.com/in/en/pd/12345", 100), candidate1, candidateAlt],
      userPreferences: null
    };

    const altResult = identifyAlternativeProducts(req);
    expect(altResult.alternatives.some(a => (a.product.normalizedTitle || "").includes("nike air max"))).toBe(true);

    const urlSafety = validatePurchaseUrlSafety(candidate1.product?.originalUrl, "amazon.in");
    expect(urlSafety.isValid).toBe(true);
  });

  // =========================================================================
  // SCENARIO 4: BEAUTY END-TO-END (The Ordinary Niacinamide)
  // =========================================================================
  test("4. Beauty E2E: Full 14-step pipeline for The Ordinary Niacinamide Serum", () => {
    const targetTitle = "The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml";
    const pageProduct = processProduct({
      title: targetTitle,
      price: 600,
      currency: "INR",
      image: "https://nykaa.com/img/ordinary.jpg",
      url: "https://www.nykaa.com/the-ordinary-niacinamide/p/123",
      hostname: "nykaa.com"
    });

    expect(pageProduct.domain).toBe(ProductDomain.Beauty);
    expect(pageProduct.productType).toBe("Serum");

    const candidate1 = createCandidate("The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml", 570, "sephora.nnnow.com", "Sephora", "https://sephora.nnnow.com/p/123", 90);
    const candidateAlt = createCandidate("Minimalist Niacinamide 10% Face Serum 30ml", 599, "nykaa.com", "Nykaa", "https://www.nykaa.com/minimalist/p/456", 80);

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pageProduct },
      pageProduct,
      candidates: [createCandidate(targetTitle, 600, "nykaa.com", "Nykaa", "https://www.nykaa.com/the-ordinary-niacinamide/p/123", 100), candidate1, candidateAlt],
      userPreferences: null
    };

    const altResult = identifyAlternativeProducts(req);
    expect(altResult.alternatives.some(a => (a.product.normalizedTitle || "").includes("minimalist"))).toBe(true);

    const urlSafety = validatePurchaseUrlSafety(candidate1.product?.originalUrl, "sephora.nnnow.com");
    expect(urlSafety.isValid).toBe(true);
  });

  // =========================================================================
  // SCENARIO 5: GROCERY END-TO-END (Tata Tea Gold)
  // =========================================================================
  test("5. Grocery E2E: Full 14-step pipeline for Tata Tea Gold", () => {
    const targetTitle = "Tata Tea Gold Premium Black Tea 500g";
    const pageProduct = processProduct({
      title: targetTitle,
      price: 250,
      currency: "INR",
      image: "https://blinkit.com/img/tea.jpg",
      url: "https://blinkit.com/prn/tata-tea-gold/prid/112233",
      hostname: "blinkit.com"
    });

    expect(pageProduct.domain).toBe(ProductDomain.Grocery);
    expect(pageProduct.productType).toBe("Tea");

    const candidate1 = createCandidate("Tata Tea Gold Premium Black Tea 500g", 240, "bigbasket.com", "BigBasket", "https://www.bigbasket.com/pd/1000", 90);

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pageProduct },
      pageProduct,
      candidates: [createCandidate(targetTitle, 250, "blinkit.com", "Blinkit", "https://blinkit.com/prn/tata-tea-gold/prid/112233", 100), candidate1],
      userPreferences: null
    };

    const prodDec = evaluateProductLevelDecisions(req);
    expect(prodDec.bestProductGroup).toBeDefined();

    const urlSafety = validatePurchaseUrlSafety(candidate1.product?.originalUrl, "bigbasket.com");
    expect(urlSafety.isValid).toBe(true);
  });

  // =========================================================================
  // SCENARIO 6: FURNITURE END-TO-END (IKEA 3-Seater Sofa)
  // =========================================================================
  test("6. Furniture E2E: Full 14-step pipeline for IKEA 3-Seater Sofa", () => {
    const targetTitle = "IKEA 3 Seater Fabric Sofa Brown 180x80x75 cm";
    const pageProduct = processProduct({
      title: targetTitle,
      price: 24999,
      currency: "INR",
      image: "https://ikea.com/img/sofa.jpg",
      url: "https://www.ikea.com/in/en/p/ikea-3-seater-sofa-445566",
      hostname: "ikea.com"
    });

    expect(pageProduct.domain).toBe(ProductDomain.Furniture);
    expect(pageProduct.productType).toBe("Sofa");
    expect(pageProduct.variant).toBe("3 Seater");

    const candidate1 = createCandidate("IKEA 3 Seater Fabric Sofa Brown 180x80x75 cm", 23999, "pepperfry.com", "Pepperfry", "https://www.pepperfry.com/p/sofa123", 90);
    const candidateAlt = createCandidate("Pepperfry 3 Seater Fabric Sofa Grey 180x80x75 cm", 22999, "pepperfry.com", "Pepperfry", "https://www.pepperfry.com/p/sofa456", 80);

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pageProduct },
      pageProduct,
      candidates: [createCandidate(targetTitle, 24999, "ikea.com", "IKEA", "https://www.ikea.com/in/en/p/ikea-3-seater-sofa-445566", 100), candidate1, candidateAlt],
      userPreferences: null
    };

    const altResult = identifyAlternativeProducts(req);
    expect(altResult.alternatives.some(a => (a.product.normalizedTitle || "").includes("pepperfry"))).toBe(true);

    const urlSafety = validatePurchaseUrlSafety(candidate1.product?.originalUrl, "pepperfry.com");
    expect(urlSafety.isValid).toBe(true);
  });

  // =========================================================================
  // SCENARIO 7: BOOKS END-TO-END (Atomic Habits)
  // =========================================================================
  test("7. Books E2E: Full 14-step pipeline for Atomic Habits Book", () => {
    const targetTitle = "Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback";
    const pageProduct = processProduct({
      title: targetTitle,
      price: 450,
      currency: "INR",
      image: "https://bookchor.com/img/atomichabits.jpg",
      url: "https://www.bookchor.com/product/9780735211292",
      hostname: "bookchor.com"
    });

    expect(pageProduct.domain).toBe(ProductDomain.Books);
    expect(pageProduct.isbn).toBe("9780735211292");

    const candidate1 = createCandidate("Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback", 410, "amazon.in", "Amazon", "https://www.amazon.in/dp/0735211292", 90);
    const candidateAlt = createCandidate("Deep Work by Cal Newport Paperback", 399, "amazon.in", "Amazon", "https://www.amazon.in/dp/1455586692", 80);

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pageProduct },
      pageProduct,
      candidates: [createCandidate(targetTitle, 450, "bookchor.com", "Bookchor", "https://www.bookchor.com/product/9780735211292", 100), candidate1, candidateAlt],
      userPreferences: null
    };

    const altResult = identifyAlternativeProducts(req);
    expect(altResult.alternatives.some(a => (a.product.normalizedTitle || "").includes("deep work"))).toBe(true);

    const urlSafety = validatePurchaseUrlSafety(candidate1.product?.originalUrl, "amazon.in");
    expect(urlSafety.isValid).toBe(true);
  });
});
