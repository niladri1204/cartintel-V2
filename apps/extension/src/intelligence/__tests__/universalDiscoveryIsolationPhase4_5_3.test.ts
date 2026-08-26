import { describe, test, expect } from "vitest";
import { processProduct } from "../engine";
import { getEligibleMerchantsForProduct, filterCandidatesByDomain, MERCHANT_REGISTRY } from "../merchantRegistry";
import { ProductDomain } from "../domain";
import type { RecommendationCandidate } from "../recommendationTypes";

describe("Phase 4.5.3 — Universal Discovery & Merchant Isolation", () => {

  // Helper to create mock candidate
  function createCandidate(title: string, hostname: string, price: number): RecommendationCandidate {
    return {
      product: processProduct({
        title,
        price,
        currency: "INR",
        image: null,
        url: `https://${hostname}/p`,
        hostname
      }),
      rankingDetails: {
        finalScore: 90,
        rankingTier: "exact_identity_tier",
        identityContribution: 50,
        qualityContribution: 20,
        priceAvailabilityContribution: 20,
        priceCompetitivenessContribution: 10,
        duplicatePenalty: 0,
        priceCompetitivenessScore: 100,
        explanation: "ok"
      }
    };
  }

  // =========================================================================
  // 1. PUMA SHOES DISCOVERY & MERCHANT ISOLATION
  // =========================================================================
  test("1. Puma Shoes pipeline: Domain=Fashion/Footwear, eligible merchants include Puma/Myntra/AJIO, excludes Croma/Nykaa/IKEA", () => {
    const shoe = processProduct({
      title: "Puma Electron Street Black Running Shoes UK 9",
      price: 3499,
      currency: "INR",
      image: null,
      url: "https://puma.com/p1",
      hostname: "puma.com"
    });

    expect(shoe.domain).toBe(ProductDomain.Fashion);
    expect(shoe.productType).toBe("Running Shoes");
    expect(shoe.brand).toBe("puma");

    const eligibleMerchants = getEligibleMerchantsForProduct(shoe.domain, shoe.category, shoe.brand);
    const merchantNames = eligibleMerchants.map(m => m.name);

    // Allowed
    expect(merchantNames).toContain("Puma Official Store");
    expect(merchantNames).toContain("Myntra");
    expect(merchantNames).toContain("AJIO");
    expect(merchantNames).toContain("Amazon");
    expect(merchantNames).toContain("Flipkart");

    // Forbidden
    expect(merchantNames).not.toContain("Croma");
    expect(merchantNames).not.toContain("Samsung Official Store");
    expect(merchantNames).not.toContain("Nykaa");
    expect(merchantNames).not.toContain("Pepperfry");
    expect(merchantNames).not.toContain("IKEA");
    expect(merchantNames).not.toContain("Bookchor");

    // Candidate Filtering Validation
    const candidateAllowed = createCandidate("Puma Electron Street Black UK 9", "myntra.com", 3499);
    const candidateForbidden = createCandidate("Croma Smart LED TV 43 Inch", "croma.com", 24999);
    const candidateForbidden2 = createCandidate("Nykaa Matte Lipstick Red", "nykaa.com", 499);

    const filtered = filterCandidatesByDomain([candidateAllowed, candidateForbidden, candidateForbidden2], shoe.domain, shoe.productType);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].product?.normalizedTitle).toContain("puma electron street");
  });

  // =========================================================================
  // 2. THE ORDINARY SERUM DISCOVERY & MERCHANT ISOLATION
  // =========================================================================
  test("2. The Ordinary Serum pipeline: Domain=Beauty, eligible merchants include Nykaa/Sephora, excludes Croma/IKEA/Bookchor", () => {
    const serum = processProduct({
      title: "The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml",
      price: 600,
      currency: "INR",
      image: null,
      url: "https://nykaa.com/p1",
      hostname: "nykaa.com"
    });

    expect(serum.domain).toBe(ProductDomain.Beauty);
    expect(serum.productType).toBe("Serum");

    const eligibleMerchants = getEligibleMerchantsForProduct(serum.domain, serum.category, serum.brand);
    const merchantNames = eligibleMerchants.map(m => m.name);

    // Allowed
    expect(merchantNames).toContain("Nykaa");
    expect(merchantNames).toContain("Sephora");
    expect(merchantNames).toContain("Amazon");
    expect(merchantNames).toContain("Flipkart");

    // Forbidden
    expect(merchantNames).not.toContain("Croma");
    expect(merchantNames).not.toContain("Samsung Official Store");
    expect(merchantNames).not.toContain("Pepperfry");
    expect(merchantNames).not.toContain("IKEA");
    expect(merchantNames).not.toContain("Bookchor");

    // Candidate Filtering Validation
    const candBeauty = createCandidate("The Ordinary Niacinamide Serum 30ml", "sephora.nnnow.com", 580);
    const candElec = createCandidate("Dell XPS 15 Laptop", "croma.com", 150000);
    const candFurn = createCandidate("Pepperfry Wooden Dining Table", "pepperfry.com", 18000);

    const filtered = filterCandidatesByDomain([candBeauty, candElec, candFurn], serum.domain, serum.productType);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].product?.normalizedTitle).toContain("the ordinary niacinamide");
  });

  // =========================================================================
  // 3. SAMSUNG GALAXY S24 DISCOVERY & MERCHANT ISOLATION
  // =========================================================================
  test("3. Samsung Galaxy S24 pipeline: Domain=Electronics, eligible merchants include Samsung/Croma/Reliance, excludes Myntra/Nykaa/IKEA", () => {
    const phone = processProduct({
      title: "Samsung Galaxy S24 256GB Smartphone",
      price: 79999,
      currency: "INR",
      image: null,
      url: "https://amazon.in/p1",
      hostname: "amazon.in"
    });

    expect(phone.domain).toBe(ProductDomain.Electronics);
    expect(phone.productType).toBe("Smartphone");
    expect(phone.brand).toBe("samsung");

    const eligibleMerchants = getEligibleMerchantsForProduct(phone.domain, phone.category, phone.brand);
    const merchantNames = eligibleMerchants.map(m => m.name);

    // Allowed
    expect(merchantNames).toContain("Samsung Official Store");
    expect(merchantNames).toContain("Croma");
    expect(merchantNames).toContain("Reliance Digital");
    expect(merchantNames).toContain("Amazon");
    expect(merchantNames).toContain("Flipkart");

    // Forbidden
    expect(merchantNames).not.toContain("Myntra");
    expect(merchantNames).not.toContain("AJIO");
    expect(merchantNames).not.toContain("Nykaa");
    expect(merchantNames).not.toContain("Pepperfry");
    expect(merchantNames).not.toContain("IKEA");
    expect(merchantNames).not.toContain("Bookchor");

    // Candidate Filtering Validation
    const candElec = createCandidate("Samsung Galaxy S24 256GB", "croma.com", 77999);
    const candFashion = createCandidate("Nike Air Jordan Sneakers", "myntra.com", 8995);
    const candBook = createCandidate("Atomic Habits Book", "bookchor.com", 399);

    const filtered = filterCandidatesByDomain([candElec, candFashion, candBook], phone.domain, phone.productType);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].product?.normalizedTitle).toContain("samsung galaxy s24");
  });

  // =========================================================================
  // 4. GROCERY DISCOVERY & MERCHANT ISOLATION
  // =========================================================================
  test("4. Grocery pipeline: Domain=Grocery, eligible merchants include Blinkit/BigBasket, excludes Croma/Nykaa/IKEA", () => {
    const tea = processProduct({
      title: "Tata Tea Gold 500g Pack",
      price: 250,
      currency: "INR",
      image: null,
      url: "https://blinkit.com/p1",
      hostname: "blinkit.com"
    });

    expect(tea.domain).toBe(ProductDomain.Grocery);

    const eligibleMerchants = getEligibleMerchantsForProduct(tea.domain, tea.category, tea.brand);
    const merchantNames = eligibleMerchants.map(m => m.name);

    // Allowed
    expect(merchantNames).toContain("Blinkit");
    expect(merchantNames).toContain("BigBasket");
    expect(merchantNames).toContain("Amazon");
    expect(merchantNames).toContain("Flipkart");

    // Forbidden
    expect(merchantNames).not.toContain("Croma");
    expect(merchantNames).not.toContain("Nykaa");
    expect(merchantNames).not.toContain("Pepperfry");
    expect(merchantNames).not.toContain("IKEA");
    expect(merchantNames).not.toContain("Bookchor");
  });

  // =========================================================================
  // 5. FURNITURE DISCOVERY & MERCHANT ISOLATION
  // =========================================================================
  test("5. Furniture pipeline: Domain=Furniture, eligible merchants include IKEA/Pepperfry, excludes Croma/Nykaa/Bookchor", () => {
    const sofa = processProduct({
      title: "IKEA 3 Seater Fabric Sofa Brown",
      price: 24999,
      currency: "INR",
      image: null,
      url: "https://ikea.com/p1",
      hostname: "ikea.com"
    });

    expect(sofa.domain).toBe(ProductDomain.Furniture);

    const eligibleMerchants = getEligibleMerchantsForProduct(sofa.domain, sofa.category, sofa.brand);
    const merchantNames = eligibleMerchants.map(m => m.name);

    // Allowed
    expect(merchantNames).toContain("IKEA");
    expect(merchantNames).toContain("Pepperfry");
    expect(merchantNames).toContain("Amazon");
    expect(merchantNames).toContain("Flipkart");

    // Forbidden
    expect(merchantNames).not.toContain("Croma");
    expect(merchantNames).not.toContain("Nykaa");
    expect(merchantNames).not.toContain("Bookchor");
    expect(merchantNames).not.toContain("Myntra");
  });

  // =========================================================================
  // 6. BOOKS DISCOVERY & MERCHANT ISOLATION
  // =========================================================================
  test("6. Books pipeline: Domain=Books, eligible merchants include Bookchor, excludes Croma/Nykaa/IKEA", () => {
    const book = processProduct({
      title: "Atomic Habits Paperback Book by James Clear",
      price: 450,
      currency: "INR",
      image: null,
      url: "https://bookchor.com/p1",
      hostname: "bookchor.com"
    });

    expect(book.domain).toBe(ProductDomain.Books);

    const eligibleMerchants = getEligibleMerchantsForProduct(book.domain, book.category, book.brand);
    const merchantNames = eligibleMerchants.map(m => m.name);

    // Allowed
    expect(merchantNames).toContain("Bookchor");
    expect(merchantNames).toContain("Amazon");
    expect(merchantNames).toContain("Flipkart");

    // Forbidden
    expect(merchantNames).not.toContain("Croma");
    expect(merchantNames).not.toContain("Nykaa");
    expect(merchantNames).not.toContain("Pepperfry");
    expect(merchantNames).not.toContain("IKEA");
    expect(merchantNames).not.toContain("Myntra");
  });
});
