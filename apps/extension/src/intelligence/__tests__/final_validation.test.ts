import { describe, it, expect } from "vitest";
import { rankDeals, validateBestListing } from "../ranking";
import type { ProductIdentity } from "../resolver";
import type { ProductIntelligence } from "../types";

describe("Phase 1.10.8 - Final Validation", () => {
  const currentProduct: ProductIntelligence = {
    normalizedTitle: "iphone 15 pro max 256gb titanium",
    originalTitle: "iPhone 15 Pro Max 256GB Titanium",
    originalPrice: 159900,
    originalCurrency: "INR",
    originalImage: "https://example.com/ip15pm.jpg",
    originalUrl: "https://example.com/ip15pm",
    brand: "Apple",
    model: "iPhone 15 Pro Max",
    category: "Smartphones",
    subcategory: null,
    productType: "mobile",
    variant: null,
    quantity: null,
    unit: null,
    packSize: null,
    size: null,
    material: null,
    gender: null,
    storage: "256GB",
    ram: null,
    packCount: null,
    language: null,
    edition: null,
    attributes: [],
    color: "Titanium",
    confidence: 100,
    metadata: {
      marketplace: "Apple Store",
      hostname: "apple.com",
      detectedAt: 1234567890
    },
    fingerprint: "apple-iphone15promax-256gb-titanium"
  };

  const validCandidate: ProductIntelligence = {
    ...currentProduct,
    originalPrice: 150000,
    originalUrl: "https://amazon.in/ip15pm",
    metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: 1234567890 },
    fingerprint: "apple-iphone15promax-256gb-titanium-amazon"
  };

  it("1. Valid exact available best listing -> passes validation", () => {
    const candidate = { ...validCandidate, originalTitle: "iPhone 15 Pro Max 256GB Titanium in stock" };
    const identity: ProductIdentity = {
      id: "test-cluster",
      confidence: 100,
      reason: "Fingerprint Match",
      representative: currentProduct,
      products: [currentProduct, candidate],
      marketplaces: ["amazon.in"],
      productCount: 2
    };

    const result = rankDeals(identity);
    const validation = validateBestListing(result);

    expect(validation.isValid).toBe(true);
    expect(validation.validationState).toBe("valid");
    expect(validation.selectedOfferValid).toBe(true);
    expect(validation.failureReasons).toHaveLength(0);
    expect(validation.validatedSelectionTier).toBe("exact_available");
  });

  it("2. Valid exact unknown-availability listing -> passes with warning", () => {
    // Neither in-stock nor out-of-stock text
    const candidate = { ...validCandidate, originalTitle: "iPhone 15 Pro Max 256GB Titanium" };
    const identity: ProductIdentity = {
      id: "test-cluster",
      confidence: 100,
      reason: "Fingerprint Match",
      representative: currentProduct,
      products: [currentProduct, candidate],
      marketplaces: ["amazon.in"],
      productCount: 2
    };

    const result = rankDeals(identity);
    const validation = validateBestListing(result);

    expect(validation.isValid).toBe(true);
    expect(validation.validationState).toBe("valid");
    expect(validation.warnings).toContain("Selected offer has unknown availability.");
  });

  it("3, 4, 5, 6, 7. Explicitly contradictory selected listing -> fails validation", () => {
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, validCandidate],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    // Tamper with the selected offer to simulate a bad selection
    if (result.bestListingDetails?.selectedOffer) {
      result.bestListingDetails.selectedOffer.identityConfidenceDetails!.matchState = "explicit_contradiction";
      result.bestListingDetails.selectedOffer.identityConfidenceDetails!.factors.mismatchedFields = ["model"];
    }

    const validation = validateBestListing(result);
    expect(validation.isValid).toBe(false);
    expect(validation.validationState).toBe("invalid_identity");
    expect(validation.failureReasons[0]).toMatch(/explicit identity or variant contradictions/);
  });

  it("8. Invalid/negative/zero final price when price is required -> fails validation", () => {
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, validCandidate],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    if (result.bestListingDetails?.selectedOffer) {
      result.bestListingDetails.selectedOffer.priceAvailabilityDetails!.priceState = "invalid_price";
    }

    const validation = validateBestListing(result);
    expect(validation.isValid).toBe(false);
    expect(validation.validationState).toBe("invalid_price");
  });

  it("9. Missing price in a legitimate fallback case -> passes without falsely failing", () => {
    const candidateWithoutPrice = { ...validCandidate, price: null, originalPrice: null };
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, candidateWithoutPrice],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    const validation = validateBestListing(result);

    // It's valid but will have a missing_price warning
    expect(validation.isValid).toBe(true);
    expect(validation.warnings).toContain("Selected offer is missing price information.");
  });

  it("10. Explicit out-of-stock exact listing incorrectly marked exact_available -> fails validation", () => {
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, validCandidate],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    if (result.bestListingDetails?.selectedOffer) {
      // Simulate selection logic error
      result.bestListingDetails.selectionTier = "exact_available";
      result.bestListingDetails.selectedOffer.priceAvailabilityDetails!.availabilityState = "out_of_stock";
    }

    const validation = validateBestListing(result);
    expect(validation.isValid).toBe(false);
    expect(validation.validationState).toBe("invalid_availability");
  });

  it("11. Selected offer not present in ranked candidate set -> fails validation", () => {
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, validCandidate],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    if (result.bestListingDetails) {
      // Create a fake offer that doesn't exist in result.offers
      result.bestListingDetails.selectedOffer = {
        ...result.bestListingDetails.selectedOffer!,
        product: { ...validCandidate, fingerprint: "hacked-fingerprint", originalUrl: "http://hack" }
      };
    }

    const validation = validateBestListing(result);
    expect(validation.isValid).toBe(false);
    expect(validation.validationState).toBe("invalid_membership");
  });

  it("12 & 13. Selected offer has invalid finalRankingScore or outside 0-100 -> fails validation", () => {
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, validCandidate],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    if (result.bestListingDetails?.selectedOffer) {
      result.bestListingDetails.selectedOffer.finalRankingScore = 150; // invalid score
    }

    const validation = validateBestListing(result);
    expect(validation.isValid).toBe(false);
    expect(validation.validationState).toBe("invalid_ranking");
  });

  it("14. Ranking details contain impossible contribution values -> fails validation", () => {
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, validCandidate],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    if (result.bestListingDetails?.selectedOffer?.rankingDetails) {
      // identity contribution max is 50
      result.bestListingDetails.selectedOffer.rankingDetails.contributions.identityContribution = 60;
    }

    const validation = validateBestListing(result);
    expect(validation.isValid).toBe(false);
    expect(validation.validationState).toBe("invalid_ranking");
  });

  it("15. Duplicate representative inconsistency -> fails validation", () => {
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, validCandidate],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    if (result.bestListingDetails?.selectedOffer) {
      // Simulate duplicate penalty < 0
      result.bestListingDetails.selectedOffer.duplicateRedundancyDetails = {
        score: 100, duplicateState: "same_identity_duplicate",
        canonicalFingerprint: "", factors: { isSameFingerprint: true, isSameIdentityMatch: true, hasVariantContradiction: false, hasHardIdentityMismatch: false, isMultiMerchantDuplicate: false },
        matchedIdentityFields: [], distinguishingFields: [], explanation: ""
      };
      result.bestListingDetails.selectedOffer.rankingDetails!.duplicatePenalty = -5;
      result.bestListingDetails.selectedOffer.rankingDetails!.contributions.duplicatePenalty = -5;
    }

    const validation = validateBestListing(result);
    expect(validation.isValid).toBe(false);
    expect(validation.validationState).toBe("invalid_duplicate");
  });

  it("16. All candidates contradictory -> no_actionable_offer validation state", () => {
    const badCandidate: ProductIntelligence = {
      ...validCandidate,
      model: "iPhone 14",
      fingerprint: "apple-iphone14"
    };

    const identity: ProductIdentity = {
      id: "test-cluster",
      confidence: 100,
      reason: "Fingerprint Match",
      representative: currentProduct,
      products: [currentProduct, badCandidate],
      marketplaces: ["amazon.in"],
      productCount: 2
    };

    const result = rankDeals(identity);
    const validation = validateBestListing(result);

    expect(validation.isValid).toBe(false);
    expect(validation.validationState).toBe("no_actionable_offer");
    expect(validation.selectedOfferValid).toBe(false);
    expect(validation.validatedSelectionTier).toBe("no_actionable_offer");
  });

  it("17. Input-order independence: reversed or shuffled candidates produce identical validation", () => {
    const candA = { ...validCandidate, price: 140000, originalPrice: 140000, fingerprint: "fp-a" };
    const candB = { ...validCandidate, price: 130000, originalPrice: 130000, fingerprint: "fp-b" };
    const candC = { ...validCandidate, price: 150000, originalPrice: 150000, fingerprint: "fp-c" };
    const candidates = [candA, candB, candC];

    const getVal = (arr: ProductIntelligence[]) => {
      const identity: ProductIdentity = {
        id: "test-cluster",
        confidence: 100,
        reason: "Fingerprint Match",
        representative: currentProduct,
        products: arr,
        marketplaces: ["amazon.in"],
        productCount: arr.length
      };
      return validateBestListing(rankDeals(identity));
    };

    const valOrig = getVal(candidates);
    const valRev = getVal([...candidates].reverse());
    const valShuf = getVal([candC, candA, candB]);

    expect(valOrig.validatedOfferFingerprint).toBe(valRev.validatedOfferFingerprint);
    expect(valOrig.validatedOfferFingerprint).toBe(valShuf.validatedOfferFingerprint);
    expect(valOrig.isValid).toBe(true);
    expect(valRev.isValid).toBe(true);
    expect(valShuf.isValid).toBe(true);
  });

  it("18. Valid selection must not mutate ranking scores/details", () => {
    const identity: ProductIdentity = {
      representative: currentProduct,
      products: [currentProduct, validCandidate],
      id: "test-cluster", confidence: 100, reason: "Fingerprint Match", marketplaces: ["amazon.in"], productCount: 2
    };

    const result = rankDeals(identity);
    const beforeRankingScore = result.bestListingDetails?.selectedOffer?.finalRankingScore;
    const beforeQualityScore = result.bestListingDetails?.selectedOffer?.qualityScore;

    validateBestListing(result);

    const afterRankingScore = result.bestListingDetails?.selectedOffer?.finalRankingScore;
    const afterQualityScore = result.bestListingDetails?.selectedOffer?.qualityScore;

    expect(beforeRankingScore).toBe(afterRankingScore);
    expect(beforeQualityScore).toBe(afterQualityScore);
  });
});

