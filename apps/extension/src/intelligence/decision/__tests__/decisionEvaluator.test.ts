import { describe, test, expect } from "vitest";
import { evaluateDecisionInputs, evaluateHardConstraint, evaluateExplicitRequirement, evaluateUserPreference } from "../decisionEvaluator";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";



describe("decisionEvaluator - Phase 1.12.3.1 Decision Evaluation Foundation", () => {
  const sampleCandidateEligible: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 45000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, 12GB RAM)",
      normalizedTitle: "samsung galaxy s24 256gb 12gb ram",
      storage: "256GB",
      ram: "12GB",
      attributes: [],
      confidence: 90,
      fingerprint: "samsung|galaxy s24"
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 90,
    priceAvailabilityScore: 90,
    identityConfidenceScore: 90,
    qualityScore: 90,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  const sampleCandidateIneligible: RecommendationCandidate = {
    product: {
      brand: "apple",
      category: "smartphone",
      originalPrice: 65000,
      originalCurrency: "INR",
      originalTitle: "Apple iPhone 15 (128GB)",
      normalizedTitle: "apple iphone 15 128gb",
      storage: "128GB",
      attributes: [],
      confidence: 90,
      fingerprint: "apple|iphone 15"
    },
    isRefurbishedOrUsed: true,
    finalRankingScore: 85,
    priceAvailabilityScore: 85,
    identityConfidenceScore: 85,
    qualityScore: 85,
    marketplaceReliabilityScore: 85,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  test("1. Fully eligible candidate (all hard constraints satisfied -> eligible)", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: 50000 },
        { attribute: "brand", operator: "equals", value: "samsung" }
      ],
      candidates: [sampleCandidateEligible]
    };

    const res = evaluateDecisionInputs(request);
    expect(res.evaluatedCount).toBe(1);
    expect(res.evaluations[0].eligibility).toBe("eligible");
    expect(res.eligibleCandidates).toHaveLength(1);
    expect(res.ineligibleCandidates).toHaveLength(0);
  });

  test("2. Hard constraint violation (violates price -> ineligible)", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: 50000 }
      ],
      candidates: [sampleCandidateIneligible]
    };

    const res = evaluateDecisionInputs(request);
    expect(res.evaluations[0].eligibility).toBe("ineligible");
    expect(res.ineligibleCandidates).toHaveLength(1);
  });

  test("3. Multiple hard constraints (one satisfied, one violated -> ineligible)", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: 70000 },
        { attribute: "brand", operator: "equals", value: "samsung" }
      ],
      candidates: [sampleCandidateIneligible]
    };

    const res = evaluateDecisionInputs(request);
    expect(res.evaluations[0].eligibility).toBe("ineligible");
    expect(res.evaluations[0].hardConstraintEvaluations[0].status).toBe("satisfied");
    expect(res.evaluations[0].hardConstraintEvaluations[1].status).toBe("violated");
  });

  test("4. Missing candidate data (marked unknown, NOT satisfied)", () => {
    const candidateNoPrice: RecommendationCandidate = {
      ...sampleCandidateEligible,
      product: {
        ...sampleCandidateEligible.product!,
        originalPrice: undefined as any
      }
    };

    const hcEval = evaluateHardConstraint(
      { attribute: "price", operator: "less_than", value: 50000 },
      candidateNoPrice
    );
    expect(hcEval.status).toBe("unknown");

    const res = evaluateDecisionInputs({
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      candidates: [candidateNoPrice]
    });
    expect(res.evaluations[0].eligibility).toBe("unknown");
  });

  test("5. Price constraints (less_than, greater_than, less_than_or_equal, equals)", () => {
    expect(evaluateHardConstraint({ attribute: "price", operator: "less_than", value: 50000 }, sampleCandidateEligible).status).toBe("satisfied");
    expect(evaluateHardConstraint({ attribute: "price", operator: "greater_than", value: 50000 }, sampleCandidateEligible).status).toBe("violated");
    expect(evaluateHardConstraint({ attribute: "price", operator: "less_than_or_equal", value: 45000 }, sampleCandidateEligible).status).toBe("satisfied");
    expect(evaluateHardConstraint({ attribute: "price", operator: "equals", value: 45000 }, sampleCandidateEligible).status).toBe("satisfied");
  });

  test("6. Brand constraints (equals case-insensitive)", () => {
    expect(evaluateHardConstraint({ attribute: "brand", operator: "equals", value: "SAMSUNG" }, sampleCandidateEligible).status).toBe("satisfied");
    expect(evaluateHardConstraint({ attribute: "brand", operator: "equals", value: "apple" }, sampleCandidateEligible).status).toBe("violated");
  });

  test("7. Condition constraints (new vs refurbished)", () => {
    expect(evaluateHardConstraint({ attribute: "condition", operator: "equals", value: "new" }, sampleCandidateEligible).status).toBe("satisfied");
    expect(evaluateHardConstraint({ attribute: "condition", operator: "equals", value: "new" }, sampleCandidateIneligible).status).toBe("violated");
    expect(evaluateHardConstraint({ attribute: "condition", operator: "equals", value: "refurbished" }, sampleCandidateIneligible).status).toBe("satisfied");
  });

  test("8. Storage/RAM constraints", () => {
    expect(evaluateHardConstraint({ attribute: "storage", operator: "equals", value: "256GB" }, sampleCandidateEligible).status).toBe("satisfied");
    expect(evaluateHardConstraint({ attribute: "ram", operator: "greater_than_or_equal", value: "8GB" }, sampleCandidateEligible).status).toBe("satisfied");
  });

  test("9. Explicit requirement matches (matched)", () => {
    const erEval = evaluateExplicitRequirement(
      { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true },
      sampleCandidateEligible
    );
    expect(erEval.status).toBe("matched");
  });

  test("10. Explicit requirement failures (not_matched)", () => {
    const erEval = evaluateExplicitRequirement(
      { attribute: "storage", value: "512GB", operator: "equals", isMandatory: true },
      sampleCandidateEligible
    );
    expect(erEval.status).toBe("not_matched");
  });

  test("11. Mandatory vs non-mandatory requirements", () => {
    const res = evaluateDecisionInputs({
      explicitRequirements: [
        { attribute: "storage", value: "512GB", operator: "equals", isMandatory: true },
        { attribute: "color", value: "blue", operator: "equals", isMandatory: false }
      ],
      candidates: [sampleCandidateEligible]
    });
    expect(res.evaluations[0].explicitRequirementEvaluations[0].status).toBe("not_matched");
    expect(res.evaluations[0].explicitRequirementEvaluations[1].status).toBe("unknown");
    expect(res.evaluations[0].violatedCount).toBe(1);
  });

  test("12. Preference matches (strongly_matched)", () => {
    const pEval = evaluateUserPreference(
      { key: "brand_loyalty", value: "samsung" },
      sampleCandidateEligible
    );
    expect(pEval.status).toBe("strongly_matched");
  });

  test("13. Preference non-matches (not_matched)", () => {
    const pEval = evaluateUserPreference(
      { key: "brand_loyalty", value: "apple" },
      sampleCandidateEligible
    );
    expect(pEval.status).toBe("not_matched");
  });

  test("14. Unknown preference data (unknown)", () => {
    const pEval = evaluateUserPreference(
      { key: "camera", value: "preferred" },
      sampleCandidateEligible
    );
    expect(pEval.status).toBe("unknown");
  });

  test("15. Hard-vs-soft separation (soft preferences never affect eligibility)", () => {
    const res = evaluateDecisionInputs({
      userPreferences: [
        { key: "brand_loyalty", value: "apple" } // candidate is Samsung
      ],
      candidates: [sampleCandidateEligible]
    });
    expect(res.evaluations[0].eligibility).toBe("eligible");
    expect(res.evaluations[0].preferenceEvaluations[0].status).toBe("not_matched");
  });

  test("16. Conflicting intent metadata preserved", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "apple" }],
      conflicts: [],
      ambiguities: [{ type: "constraint_preference_tension", attribute: "brand", message: "tension", sources: ["hard_constraint", "user_preference"], severity: "low" }],
      candidates: [sampleCandidateEligible]
    };
    const res = evaluateDecisionInputs(request);
    expect(res.request.ambiguities).toHaveLength(1);
    expect(res.evaluations[0].eligibility).toBe("eligible");
  });

  test("17. Candidate preservation (original candidate unmutated)", () => {
    const candidateCopy = JSON.parse(JSON.stringify(sampleCandidateEligible));
    evaluateDecisionInputs({
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      candidates: [sampleCandidateEligible]
    });
    expect(sampleCandidateEligible).toEqual(candidateCopy);
  });

  test("18. Input immutability (original request unmutated)", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      candidates: [sampleCandidateEligible]
    };
    const reqCopy = JSON.parse(JSON.stringify(request));
    evaluateDecisionInputs(request);
    expect(request).toEqual(reqCopy);
  });

  test("19. Deterministic repeated execution", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      candidates: [sampleCandidateEligible, sampleCandidateIneligible]
    };
    const res1 = evaluateDecisionInputs(request);
    const res2 = evaluateDecisionInputs(request);
    expect(res1).toEqual(res2);
  });

  test("20. Empty candidates array returns empty evaluation list safely", () => {
    const res = evaluateDecisionInputs({ candidates: [] });
    expect(res.evaluatedCount).toBe(0);
    expect(res.evaluations).toEqual([]);
    expect(res.eligibleCandidates).toEqual([]);
    expect(res.ineligibleCandidates).toEqual([]);
  });

  test("21. Null/empty request safety", () => {
    const res = evaluateDecisionInputs(null, [sampleCandidateEligible]);
    expect(res.evaluatedCount).toBe(1);
    expect(res.evaluations[0].eligibility).toBe("eligible");
  });

  test("22. No candidate selection (no recommended candidate chosen)", () => {
    const res = evaluateDecisionInputs({ candidates: [sampleCandidateEligible] });
    expect((res as any).recommendedCandidate).toBeUndefined();
    expect((res as any).winner).toBeUndefined();
  });

  test("23. No final recommendation score calculated", () => {
    const res = evaluateDecisionInputs({ candidates: [sampleCandidateEligible] });
    expect((res as any).recommendationScore).toBeUndefined();
    expect((res.evaluations[0] as any).finalScore).toBeUndefined();
  });
});
