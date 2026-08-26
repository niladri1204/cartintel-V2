import { describe, test, expect, vi } from "vitest";
import { reconcileVisualIdentity } from "../visualIdentityReconciliation";
import type { VisualProductRecognitionResult } from "../types";
import { discoverProductsFromImage } from "../discovery";
import type { ProductIntelligence } from "../../types";

describe("Visual Identity Reconciliation", () => {
  // Test 1: Exact visual/page model agreement
  test("1. Exact visual/page model agreement", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      brand: "Google",
      model: "Pixel 10a",
      productType: "Smartphone",
      category: "Smartphones",
      visualAttributes: {},
      confidence: 0.9,
      evidence: []
    };
    const pageIdentity = {
      brand: "Google",
      model: "Pixel 10a"
    };

    const reconciliation = reconcileVisualIdentity(visualResult, pageIdentity);
    expect(reconciliation.status).toBe("consistent");
    expect(reconciliation.resolvedBrand).toBe("Google");
    expect(reconciliation.resolvedModel).toBe("Pixel 10a");
    expect(reconciliation.conflicts).toHaveLength(0);
  });

  // Test 2: Different model generation conflict: Pixel 10a vs Pixel 9a
  test("2. Different model generation conflict: Pixel 10a vs Pixel 9a", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      brand: "Google",
      model: "Pixel 9a",
      productType: "Smartphone",
      category: "Smartphones",
      visualAttributes: {},
      confidence: 0.85,
      evidence: []
    };
    const pageIdentity = {
      brand: "Google",
      model: "Pixel 10a"
    };

    const reconciliation = reconcileVisualIdentity(visualResult, pageIdentity);
    expect(reconciliation.status).toBe("conflicting");
    // resolvedModel MUST remain page model (Pixel 10a)
    expect(reconciliation.resolvedModel).toBe("Pixel 10a");
    expect(reconciliation.visualModel).toBe("Pixel 9a");
    expect(reconciliation.conflicts[0]).toContain("Visual model Pixel 9a conflicts with page model Pixel 10a");
  });

  // Test 3: Brand conflict
  test("3. Brand conflict", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      brand: "Samsung",
      model: "Galaxy S24",
      productType: "Smartphone",
      category: "Smartphones",
      visualAttributes: {},
      confidence: 0.8,
      evidence: []
    };
    const pageIdentity = {
      brand: "Google",
      model: "Pixel 10a"
    };

    const reconciliation = reconcileVisualIdentity(visualResult, pageIdentity);
    expect(reconciliation.status).toBe("conflicting");
    expect(reconciliation.resolvedBrand).toBe("Google");
    expect(reconciliation.resolvedModel).toBe("Pixel 10a");
    expect(reconciliation.conflicts[0]).toContain("Visual brand Samsung conflicts with page brand Google");
  });

  // Test 4: Visual model missing but page model known
  test("4. Visual model missing but page model known", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "partially_recognized",
      brand: "Google",
      model: null,
      productType: "Smartphone",
      category: "Smartphones",
      visualAttributes: {},
      confidence: 0.7,
      evidence: []
    };
    const pageIdentity = {
      brand: "Google",
      model: "Pixel 10a"
    };

    const reconciliation = reconcileVisualIdentity(visualResult, pageIdentity);
    expect(reconciliation.status).toBe("consistent"); // consistent on the fields they both provide (brand)
    expect(reconciliation.resolvedBrand).toBe("Google");
    expect(reconciliation.resolvedModel).toBe("Pixel 10a");
    expect(reconciliation.conflicts).toHaveLength(0);
  });

  // Test 5: Page model missing but visual model known
  test("5. Page model missing but visual model known", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      brand: "Google",
      model: "Pixel 10a",
      productType: "Smartphone",
      category: "Smartphones",
      visualAttributes: {},
      confidence: 0.9,
      evidence: []
    };
    const pageIdentity = {
      brand: "Google",
      model: null
    };

    const reconciliation = reconcileVisualIdentity(visualResult, pageIdentity);
    expect(reconciliation.status).toBe("supporting");
    expect(reconciliation.resolvedBrand).toBe("Google");
    expect(reconciliation.resolvedModel).toBe("Pixel 10a"); // Augments missing info
    expect(reconciliation.conflicts).toHaveLength(0);
  });

  // Test 6: Normalization of equivalent model strings
  test("6. Normalization of equivalent model strings", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      brand: "Google",
      model: "Google Pixel 10a",
      productType: "Smartphone",
      category: "Smartphones",
      visualAttributes: {},
      confidence: 0.9,
      evidence: []
    };
    const pageIdentity = {
      brand: "Google",
      model: "Pixel 10a"
    };

    const reconciliation = reconcileVisualIdentity(visualResult, pageIdentity);
    expect(reconciliation.status).toBe("consistent");
    expect(reconciliation.resolvedModel).toBe("Pixel 10a");
    expect(reconciliation.conflicts).toHaveLength(0);
  });

  // Test 7: Conflicting model does not replace page identity in search input
  test("7. Conflicting model does not replace page identity in search input", async () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      brand: "Google",
      model: "Pixel 9a",
      productType: "Smartphone",
      category: "Smartphones",
      visualAttributes: {
        color: "Obsidian"
      },
      confidence: 0.8,
      evidence: []
    };
    const pageContext: ProductIntelligence = {
      originalTitle: "Google Pixel 10a (Obsidian, 128GB)",
      brand: "Google",
      model: "Pixel 10a",
      category: "Smartphones",
      originalPrice: 45000,
      originalCurrency: "INR",
      confidence: 90,
      fingerprint: "google|pixel 10a",
      metadata: {
        marketplace: "Flipkart",
        hostname: "flipkart.com",
        detectedAt: Date.now()
      }
    };

    const request = {
      image: { url: "https://example.com/img.jpg" },
      visualRecognitionResult: visualResult,
      existingProductContext: pageContext
    };

    const mockEngine = {
      discover: vi.fn().mockResolvedValue({
        queries: [{ query: "Google Pixel 10a Obsidian", provider: "mock" }],
        candidates: []
      })
    } as any;

    const result = await discoverProductsFromImage(request, {
      discoveryEngine: mockEngine
    });

    // Verification: Visual conflict must not poison discovery query
    expect(result.status).toBe("no_results"); // exits on empty candidates safely
    expect(result.reconciliation?.status).toBe("conflicting");
    expect(result.reconciliation?.resolvedModel).toBe("Pixel 10a");
    expect(result.reconciliation?.visualModel).toBe("Pixel 9a");
    
    // Check search terms/query construction uses resolved page model instead of conflicting visual model
    expect(result.searchAttributes?.model).toBe("Pixel 10a");
    expect(result.searchAttributes?.searchTerms).not.toContain("Pixel 9a");
    expect(result.searchAttributes?.searchTerms).toContain("Pixel 10a");
    
    // Ensure existing engine called with the correct non-poisoned query
    expect(mockEngine.discover).toHaveBeenCalled();
    const queryArg = mockEngine.discover.mock.calls[0][0];
    expect(queryArg.model).toBe("Pixel 10a");
    expect(queryArg.title).not.toContain("Pixel 9a");
  });

  // Test 8: Determinism and input immutability
  test("8. Determinism and input immutability", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      brand: "Google",
      model: "Pixel 9a",
      productType: "Smartphone",
      category: "Smartphones",
      visualAttributes: {},
      confidence: 0.8,
      evidence: []
    };
    const pageIdentity = {
      brand: "Google",
      model: "Pixel 10a"
    };

    const visualResultFrozen = JSON.parse(JSON.stringify(visualResult));
    const pageIdentityFrozen = JSON.parse(JSON.stringify(pageIdentity));

    const reconciliation1 = reconcileVisualIdentity(visualResult, pageIdentity);
    const reconciliation2 = reconcileVisualIdentity(visualResult, pageIdentity);

    expect(reconciliation1).toEqual(reconciliation2);
    expect(visualResult).toEqual(visualResultFrozen);
    expect(pageIdentity).toEqual(pageIdentityFrozen);
  });
});
