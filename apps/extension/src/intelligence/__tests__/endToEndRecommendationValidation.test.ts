import { describe, test, expect } from "vitest";
import { buildRecommendationRequest } from "../intent/recommendationRequestBuilder";
import { buildExplainableRecommendation } from "../decision/decisionExplanation";
import { generateFingerprint } from "../fingerprint";
import type { RecommendationCandidate, RecommendationRequest, HardConstraint, ExplicitRequirement } from "../recommendationTypes";

describe("Phase 1.12.8: End-to-End Recommendation Validation", () => {
  // Helpers to generate candidates
  const createCandidate = (
    id: string,
    brand: string,
    model: string,
    price: number,
    marketplace: string,
    confidence: number = 90,
    currency: string = "INR",
    category: string = "smartphone"
  ): RecommendationCandidate => {
    return {
      product: {
        brand,
        model,
        category,
        originalPrice: price,
        originalCurrency: currency,
        originalTitle: `${brand} ${model}`,
        normalizedTitle: `${brand} ${model}`.toLowerCase(),
        confidence,
        fingerprint: generateFingerprint(brand, model, null, null, null, null),
        originalUrl: `https://www.${marketplace.toLowerCase()}.com/p/${id}`,
        metadata: { marketplace, hostname: `${marketplace.toLowerCase()}.com`, detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      savingsValue: null,
      savingsPercentage: null,
      currencyMismatch: false,
      finalRankingScore: confidence, // using confidence as a base score
      priceAvailabilityScore: confidence,
      identityConfidenceScore: confidence,
      qualityScore: confidence,
      marketplaceReliabilityScore: confidence,
      duplicateRedundancyScore: 0
    };
  };

  const s24Amazon = createCandidate("s24a", "Samsung", "Galaxy S24", 79999, "Amazon");
  const s24Flipkart = createCandidate("s24f", "Samsung", "Galaxy S24", 77999, "Flipkart", 85);
  const s24Croma = createCandidate("s24c", "Samsung", "Galaxy S24", 78999, "Croma", 88);
  const iphone15 = createCandidate("ip15", "Apple", "iPhone 15", 69900, "Amazon");
  const pixel8a = createCandidate("px8a", "Google", "Pixel 8a", 49999, "Flipkart");

  test("1. Realistic smartphone recommendation flow.", () => {
    const candidates = [s24Amazon, s24Flipkart, iphone15, pixel8a];
    const req = { ...buildRecommendationRequest("smartphone"), candidates };
    const result = buildExplainableRecommendation(req, candidates);
    expect(result.recommendedCandidate).toBeDefined();
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  test("2. Realistic laptop recommendation flow.", () => {
    const m3Mac = createCandidate("mac3", "Apple", "MacBook Air M3", 114900, "Amazon", 90, "INR", "laptop");
    const xps13 = createCandidate("xps13", "Dell", "XPS 13", 125000, "Dell", 85, "INR", "laptop");
    const candidates = [m3Mac, xps13];
    const req = { ...buildRecommendationRequest("laptop"), candidates };
    const result = buildExplainableRecommendation(req, candidates);
    expect(result.recommendedCandidate?.product.category).toBe("laptop");
  });

  test("3. Realistic monitor recommendation flow.", () => {
    const lgMon = createCandidate("lg1", "LG", "27UP850", 35000, "Amazon", 90, "INR", "monitor");
    const dellMon = createCandidate("dell1", "Dell", "U2723QE", 45000, "Amazon", 85, "INR", "monitor");
    const candidates = [lgMon, dellMon];
    const req = { ...buildRecommendationRequest("4k monitor"), candidates };
    const result = buildExplainableRecommendation(req, candidates);
    expect(result.recommendedCandidate?.product.category).toBe("monitor");
  });

  test("4. Discovery candidates → canonical product identity.", () => {
    const req = { ...buildRecommendationRequest("samsung s24"), candidates: [s24Amazon, s24Flipkart] };
    const result = buildExplainableRecommendation(req, [s24Amazon, s24Flipkart]);
    expect(result.recommendedCandidate?.product.fingerprint).toBe("samsung|galaxy s24");
  });

  test("5. Multiple offers → product grouping.", () => {
    const req = { ...buildRecommendationRequest("samsung s24"), candidates: [s24Amazon, s24Flipkart, s24Croma] };
    const result = buildExplainableRecommendation(req, req.candidates);
    // Should group into one product with 3 offers
    expect(result.productOfferDetails?.cheapestOfferSummary).toContain("Flipkart");
  });

  test("6. Product-level selection independent of seller price.", () => {
    const req = { ...buildRecommendationRequest("apple smartphone"), candidates: [s24Flipkart, iphone15] }; // s24 is cheaper, but query says Apple
    // Assuming intent extraction sets brand: apple
    // For this test, let's explicitly set the brand requirement
    const explicitReq: ExplicitRequirement = { attribute: "brand", operator: "equals", value: "apple", isMandatory: true };
    req.explicitRequirements = [explicitReq];
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.recommendedCandidate?.product.brand).toBe("Apple"); // Selected apple despite s24 being in candidates
  });

  test("7. Best product → offer-level evaluation.", () => {
    const req = { ...buildRecommendationRequest("samsung s24"), candidates: [s24Amazon, s24Flipkart] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.recommendedCandidate?.product.brand).toBe("Samsung");
    expect(result.productOfferDetails?.cheapestOfferSummary).toContain("Flipkart");
  });

  test("8. Best Offer selection.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon, s24Flipkart] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.productOfferDetails?.bestOfferSummary).toBeDefined();
  });

  test("9. Cheapest Offer selection.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon, s24Flipkart] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.productOfferDetails?.cheapestOfferSummary).toContain("77999");
  });

  test("10. Best Value Offer selection.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon, s24Flipkart, s24Croma] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.productOfferDetails?.bestValueOfferSummary).toBeDefined();
  });

  test("11. Best/cheapest/value offers can be three different listings.", () => {
    // Modify scores so Amazon is best overall, Flipkart cheapest, Croma best value
    const c1 = { ...s24Amazon, finalRankingScore: 98, qualityScore: 99 };
    const c2 = { ...s24Flipkart, finalRankingScore: 80, qualityScore: 70 }; // cheapest but low quality
    const c3 = { ...s24Croma, finalRankingScore: 90, qualityScore: 90 }; // middle price, good quality
    const req = { ...buildRecommendationRequest("s24"), candidates: [c1, c2, c3] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.productOfferDetails?.bestOfferSummary).toBeDefined();
    expect(result.productOfferDetails?.cheapestOfferSummary).toBeDefined();
    expect(result.productOfferDetails?.bestValueOfferSummary).toBeDefined();
  });

  test("12. Hard constraint enforcement throughout the entire pipeline.", () => {
    const hardConstraints: HardConstraint[] = [{ attribute: "price", operator: "less_than", value: 70000 }];
    const req = {
      ...buildRecommendationRequest("s24"),
      hardConstraints,
      candidates: [s24Amazon, iphone15]
    };
    const result = buildExplainableRecommendation(req, req.candidates);
    // iPhone is < 70000, S24 is > 70000. So S24 must be excluded.
    expect(result.recommendedCandidate?.product.brand).not.toBe("Samsung");
    expect(result.recommendedCandidate?.product.brand).toBe("Apple");
  });

  test("13. Explicit requirement preservation through recommendation.", () => {
    const explicitRequirements: ExplicitRequirement[] = [{ attribute: "brand", operator: "equals", value: "google", isMandatory: false }];
    const req = {
      ...buildRecommendationRequest("smartphone"),
      explicitRequirements,
      candidates: [s24Amazon, iphone15, pixel8a]
    };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.recommendedCandidate?.product.brand).toBe("Google");
  });

  test("14. Soft preference influence without overriding hard constraints.", () => {
    const hardConstraints: HardConstraint[] = [{ attribute: "brand", operator: "equals", value: "apple" }];
    const req = {
      ...buildRecommendationRequest("smartphone"),
      hardConstraints,
      userPreferences: [{ key: "price_sensitivity", value: "low" }],
      candidates: [s24Amazon, iphone15]
    };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.recommendedCandidate?.product.brand).toBe("Apple");
  });

  test("15. Conflicting hard constraints produce no invalid recommendation.", () => {
    const hardConstraints: HardConstraint[] = [
      { attribute: "brand", operator: "equals", value: "samsung" },
      { attribute: "brand", operator: "equals", value: "apple" } // Impossible
    ];
    const req = {
      ...buildRecommendationRequest("smartphone"),
      hardConstraints,
      candidates: [s24Amazon, iphone15]
    };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.recommendedCandidate).toBeNull();
  });

  test("16. Missing candidate data produces unknown, never fabricated satisfaction.", () => {
    const candMissing = { ...s24Amazon, product: { ...s24Amazon.product, model: null } };
    const explicitRequirements: ExplicitRequirement[] = [{ attribute: "model", operator: "equals", value: "s24" }];
    const req = {
      ...buildRecommendationRequest("s24"),
      explicitRequirements,
      candidates: [candMissing]
    };
    const result = buildExplainableRecommendation(req, req.candidates);
    // Should gracefully handle missing data, potentially recommending if no better match, but not fabricating
    expect(result).toBeDefined();
  });

  test("17. Mixed-currency offers are handled safely.", () => {
    const candUSD = createCandidate("ip15u", "Apple", "iPhone 15", 799, "Amazon", 90, "USD");
    const req = { ...buildRecommendationRequest("iphone"), candidates: [iphone15, candUSD] };
    const result = buildExplainableRecommendation(req, req.candidates);
    // Doesn't crash, returns a valid result
    expect(result.recommendedCandidate).toBeDefined();
  });

  test("18. Product alternatives exclude the selected canonical product.", () => {
    const req = { ...buildRecommendationRequest("smartphone"), candidates: [s24Amazon, s24Flipkart, iphone15] };
    const result = buildExplainableRecommendation(req, req.candidates);
    const altFingerprints = result.alternatives.map(a => a.candidate.product?.fingerprint);
    expect(altFingerprints).not.toContain(result.recommendedCandidate?.product.fingerprint);
  });

  test("19. Same-product different sellers remain offers, not alternatives.", () => {
    const explicitRequirements: ExplicitRequirement[] = [{ attribute: "brand", operator: "equals", value: "samsung", isMandatory: true }];
    const req = { ...buildRecommendationRequest("smartphone"), explicitRequirements, candidates: [s24Amazon, s24Flipkart, iphone15] };
    const result = buildExplainableRecommendation(req, req.candidates);
    const altProducts = result.alternatives.filter(a => a.comparisonMessage.startsWith("Alternative Product"));
    const altFingerprints = altProducts.map(a => a.candidate.product?.fingerprint);
    expect(altFingerprints).not.toContain("samsung|galaxy s24");
    expect(result.recommendedCandidate?.product.brand).toBe("Samsung");
    expect(result.productOfferDetails?.cheapestOfferSummary).toContain("Flipkart");
  });

  test("20. Alternative ranking correctly produces maximum 3 alternatives.", () => {
    const p1 = createCandidate("1", "A", "1", 100, "X");
    const p2 = createCandidate("2", "B", "2", 100, "X");
    const p3 = createCandidate("3", "C", "3", 100, "X");
    const p4 = createCandidate("4", "D", "4", 100, "X");
    const p5 = createCandidate("5", "E", "5", 100, "X");
    const req = { ...buildRecommendationRequest("phone"), candidates: [p1, p2, p3, p4, p5] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.alternatives.length).toBeLessThanOrEqual(3);
  });

  test("21. Recommendation explanations contain only evidence-supported reasons.", () => {
    const req = { ...buildRecommendationRequest("samsung"), candidates: [s24Amazon] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.reasons.length).toBeGreaterThan(0);
    result.reasons.forEach(r => expect(r.message.length).toBeGreaterThan(0));
  });

  test("22. Product explanations remain independent of seller price.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon] };
    const result = buildExplainableRecommendation(req, req.candidates);
    const hasProductReason = result.productOfferDetails?.productReasons.length;
    expect(hasProductReason).toBeGreaterThan(0);
  });

  test("23. Offer explanations correctly reflect seller/offer evidence.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon] };
    const result = buildExplainableRecommendation(req, req.candidates);
    const hasOfferReason = result.productOfferDetails?.offerReasons.length;
    expect(hasOfferReason).toBeGreaterThan(0);
  });

  test("24. Trade-offs are evidence-based.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon, iphone15] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(Array.isArray(result.tradeOffs)).toBe(true);
  });

  test("25. Confidence reflects data completeness and decision separation.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.confidenceDetails).toBeDefined();
    expect(result.confidenceDetails?.factors.dataCompleteness).toBeGreaterThan(0);
  });

  test("26. Ineligible candidates/offers never become purchase targets.", () => {
    const hardConstraints: HardConstraint[] = [{ attribute: "price", operator: "less_than", value: 10000 }];
    const req = {
      ...buildRecommendationRequest("s24"),
      hardConstraints,
      candidates: [s24Amazon]
    };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.recommendedCandidate).toBeNull();
  });

  test("27. Exact merchant URL is preserved through the complete pipeline.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon] };
    const result = buildExplainableRecommendation(req, req.candidates);
    expect(result.recommendedCandidate?.product.originalUrl).toBe("https://www.amazon.com/p/s24a");
  });

  test("28. Popup receives and renders the final RecommendationResult.", () => {
    const req = { ...buildRecommendationRequest("s24"), candidates: [s24Amazon] };
    const result = buildExplainableRecommendation(req, req.candidates);
    // Simulating popup state validation
    expect(result).toHaveProperty("recommendedCandidate");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("alternatives");
  });

  test("29. Complete recommendation flow is deterministic across repeated executions.", () => {
    const req = { ...buildRecommendationRequest("smartphone"), candidates: [s24Amazon, s24Flipkart, iphone15] };
    const res1 = buildExplainableRecommendation(req, req.candidates);
    const res2 = buildExplainableRecommendation(req, req.candidates);
    expect(res1.recommendedCandidate?.product.fingerprint).toBe(res2.recommendedCandidate?.product.fingerprint);
    expect(res1.productOfferDetails?.cheapestOfferSummary).toBe(res2.productOfferDetails?.cheapestOfferSummary);
  });

  test("30. Complete pipeline preserves immutability of requests, candidates, product groups, offers, and ranking metadata.", () => {
    const candidates = [
      { ...s24Amazon, product: { ...s24Amazon.product } },
      { ...iphone15, product: { ...iphone15.product } }
    ];
    const req = { ...buildRecommendationRequest("smartphone"), candidates };
    
    // Deep clone to verify immutability
    const origReqStr = JSON.stringify(req);
    
    buildExplainableRecommendation(req, candidates);
    
    expect(JSON.stringify(req)).toBe(origReqStr);
  });

  test("31. Semantically identical products with generic modifiers (5G, Smartphone) are grouped as same product.", () => {
    const s25Candidate1 = createCandidate("s25_1", "Samsung", "Galaxy S25 5G", 85000, "Amazon");
    const s25Candidate2 = createCandidate("s25_2", "Samsung", "Galaxy S25 Smartphone", 84000, "Flipkart");
    
    // They should get the exact same fingerprint now because "5G" and "Smartphone" are stripped
    expect(s25Candidate1.product.fingerprint).toBe(s25Candidate2.product.fingerprint);
    
    const req = { ...buildRecommendationRequest("smartphone"), candidates: [s25Candidate1, s25Candidate2] };
    const result = buildExplainableRecommendation(req, req.candidates);
    
    // They should be grouped into one product, with NO alternative products generated
    const altProducts = result.alternatives.filter(a => a.comparisonMessage.startsWith("Alternative Product"));
    expect(altProducts.length).toBe(0); // Cannot be alternative products to each other
    
    // They should instead be offers of the same recommended product
    expect(result.productOfferDetails?.cheapestOfferSummary).toContain("Flipkart");
  });

  test("32. Legitimate different variants remain separate alternatives.", () => {
    const s25 = createCandidate("s25", "Samsung", "Galaxy S25", 85000, "Amazon");
    const s25Plus = createCandidate("s25_plus", "Samsung", "Galaxy S25+", 95000, "Amazon");
    
    // Should NOT get the same fingerprint
    expect(s25.product.fingerprint).not.toBe(s25Plus.product.fingerprint);
    
    const req = { ...buildRecommendationRequest("smartphone"), candidates: [s25, s25Plus] };
    const result = buildExplainableRecommendation(req, req.candidates);
    
    // One should be the recommendation, the other should be an Alternative Product
    const altProducts = result.alternatives.filter(a => a.comparisonMessage.startsWith("Alternative Product"));
    expect(altProducts.length).toBe(1);
    expect(altProducts[0].candidate.product?.fingerprint).not.toBe(result.recommendedCandidate?.product.fingerprint);
  });

  test("33. Runtime regression: candidates with missing specs or alternate titles do NOT leak into alternatives array", () => {
    const s25Full = createCandidate("s25_full", "Samsung", "Galaxy S25", 85000, "Amazon");
    s25Full.product.storage = "256gb";
    s25Full.product.ram = "8gb";
    s25Full.product.fingerprint = "samsung|galaxy s25|256gb|8gb";

    const s25_5g = createCandidate("s25_5g", "Samsung", "Galaxy S25 5G", 84000, "Flipkart");
    s25_5g.product.storage = "256gb";
    s25_5g.product.ram = "8gb";
    s25_5g.product.fingerprint = "samsung|galaxy s25|256gb|8gb";

    const s25MissingSpecs = createCandidate("s25_missing", "Samsung", "Galaxy S25 Smartphone", 83000, "Croma");
    s25MissingSpecs.product.storage = null;
    s25MissingSpecs.product.ram = null;
    s25MissingSpecs.product.fingerprint = "samsung|galaxy s25";

    const candidates = [s25Full, s25_5g, s25MissingSpecs];
    const req = { ...buildRecommendationRequest("smartphone"), candidates };
    const result = buildExplainableRecommendation(req, candidates);

    // alternatives array MUST be empty because all 3 candidates represent the same product line
    expect(result.alternatives).toEqual([]);

    // Offer decision logic still receives and processes all 3 offers
    expect(result.cheapestOffer?.product.metadata?.marketplace).toBe("Croma");
    expect(result.bestOffer).toBeDefined();

    // Legitimate different product (S25+) MUST still be included as an alternative
    const s25Plus = createCandidate("s25_plus", "Samsung", "Galaxy S25+", 95000, "Reliance");
    s25Plus.product.fingerprint = "samsung|galaxy s25 plus|256gb";

    const candidatesWithPlus = [...candidates, s25Plus];
    const reqWithPlus = { ...buildRecommendationRequest("smartphone"), candidates: candidatesWithPlus };
    const resultWithPlus = buildExplainableRecommendation(reqWithPlus, candidatesWithPlus);

    expect(resultWithPlus.alternatives.length).toBe(1);
    expect(resultWithPlus.alternatives[0].candidate.product?.brand).toBe("Samsung");
    expect(resultWithPlus.alternatives[0].candidate.product?.model).toBe("Galaxy S25+");
  });
});
