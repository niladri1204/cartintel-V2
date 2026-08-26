import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import type { ImageInput, VisualProductRecognitionResult } from "../types";
import { discoverProductsFromImage } from "../discovery";
import { DiscoveryEngine } from "../../../services/search/discoveryEngine";
import { VisualProductRecognitionService } from "../service";
import type { RawProductResult } from "../../../services/search/types";

// Mock DiscoveryEngine to simulate search responses without real external API calls
class MockDiscoveryEngine extends DiscoveryEngine {
  private mockCandidates: RawProductResult[] = [];
  private capturedInput: any = null;

  constructor() {
    // Pass dummy SearchProvider
    super({
      name: "MockProvider",
      search: async () => ({
        query: {
          query: "dummy",
          title: "dummy",
          brand: null,
          model: null,
          category: null,
          type: "exact_identifier" as const,
          priority: 1
        },
        products: [],
        provider: "MockProvider",
        searchedAt: new Date().toISOString()
      })
    });
  }

  setMockCandidates(candidates: RawProductResult[]) {
    this.mockCandidates = candidates;
  }

  getCapturedInput() {
    return this.capturedInput;
  }

  override async discover(input: any): Promise<any> {
    this.capturedInput = input;
    return {
      queries: [
        { query: input.title, provider: "MockProvider", searchedAt: new Date().toISOString() }
      ],
      candidates: this.mockCandidates
    };
  }
}

// Mock VisualProductRecognitionService
class MockRecognitionService extends VisualProductRecognitionService {
  private mockResult: VisualProductRecognitionResult | null = null;

  setMockResult(result: VisualProductRecognitionResult | null) {
    this.mockResult = result;
  }

  override async recognizeProductFromImage(
    _image: ImageInput,
    _options?: any
  ): Promise<VisualProductRecognitionResult> {
    if (this.mockResult) return this.mockResult;
    return {
      status: "unknown",
      category: null,
      brand: null,
      model: null,
      productType: null,
      visualAttributes: {},
      confidence: 0,
      evidence: []
    };
  }
}

describe("Phase 3.3 — Image-to-Product & Similar Product Discovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1787305332200));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const sampleImage: ImageInput = {
    url: "https://example.com/s24.jpg",
    metadata: { type: "product_image", filename: "s24.jpg" }
  };

  const sampleRecognition: VisualProductRecognitionResult = {
    status: "recognized",
    category: "Electronics",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    productType: "Smartphone",
    visualAttributes: {
      color: "Titanium",
      formFactor: "Bar"
    },
    confidence: 0.95,
    evidence: [
      { source: "logo", description: "Samsung branding", confidence: 0.95 },
      { source: "ocr", description: "Galaxy S24 Ultra text", confidence: 0.95 }
    ]
  };

  // Mock candidates returned by search provider
  const candidateAmazonS24: RawProductResult = {
    title: "Samsung Galaxy S24 Ultra 5G (Titanium Gray, 12GB RAM, 256GB Storage)",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    price: 95000,
    currency: "INR",
    source: "Amazon",
    url: "https://www.amazon.in/dp/B0CSZD1S7S"
  };

  const candidateFlipkartS24: RawProductResult = {
    title: "SAMSUNG Galaxy S24 Ultra (Titanium Gray, 256 GB)",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    price: 94000,
    currency: "INR",
    source: "Flipkart",
    url: "https://www.flipkart.com/samsung-galaxy-s24-ultra/p/itm"
  };

  const candidateIphone15: RawProductResult = {
    title: "Apple iPhone 15 Pro Max (Natural Titanium, 256 GB)",
    brand: "Apple",
    model: "iPhone 15 Pro Max",
    price: 139000,
    currency: "INR",
    source: "Amazon",
    url: "https://www.amazon.in/dp/B0CHX1W1S9"
  };

  // Test 1: Image → visual recognition → discovery query flow
  test("1. Orchestrates full visual query flow correctly", async () => {
    const recService = new MockRecognitionService();
    recService.setMockResult(sampleRecognition);

    const discEngine = new MockDiscoveryEngine();
    discEngine.setMockCandidates([candidateAmazonS24]);

    const result = await discoverProductsFromImage(
      { image: sampleImage },
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    expect(result.status).toBe("success");
    expect(result.recognition).toEqual(sampleRecognition);
    expect(result.generatedQueries).toContain("Samsung Galaxy S24 Ultra Titanium");
    expect(result.discoveredCandidates.length).toBe(1);
    expect(result.discoveredCandidates[0].originalTitle).toBe(candidateAmazonS24.title);
  });

  // Test 2: Visual search attributes correctly reach the existing discovery boundary
  test("2. Exposes visual attributes correctly in SearchQueryInput", async () => {
    const recService = new MockRecognitionService();
    recService.setMockResult(sampleRecognition);

    const discEngine = new MockDiscoveryEngine();

    await discoverProductsFromImage(
      { image: sampleImage },
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    const capturedInput = discEngine.getCapturedInput();
    expect(capturedInput).toBeDefined();
    expect(capturedInput.brand).toBe("Samsung");
    expect(capturedInput.model).toBe("Galaxy S24 Ultra");
    expect(capturedInput.attributes?.color).toBe("Titanium");
    expect(capturedInput.attributes?.formFactor).toBe("Bar");
  });

  // Test 3: Exact/likely product discovery result handling
  test("3. Identifies exact / likely matched products from candidates", async () => {
    const recService = new MockRecognitionService();
    recService.setMockResult(sampleRecognition);

    const discEngine = new MockDiscoveryEngine();
    // Return a candidate that matches S24 Ultra, and one that doesn't (iPhone 15)
    discEngine.setMockCandidates([candidateAmazonS24, candidateIphone15]);

    const result = await discoverProductsFromImage(
      { image: sampleImage },
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    expect(["exact_match", "likely_match"]).toContain(result.matchStatus);
    expect(result.matchedProducts.length).toBe(1);
    expect(result.matchedProducts[0].brand).toBe("samsung");
    expect(result.matchedProducts[0].model).toBe("galaxy s24 ultra");
  });

  // Test 4: Similar products remain distinct canonical products
  test("4. Clusters non-matched candidates as similar products", async () => {
    const recService = new MockRecognitionService();
    recService.setMockResult(sampleRecognition);

    const discEngine = new MockDiscoveryEngine();
    discEngine.setMockCandidates([candidateAmazonS24, candidateIphone15]);

    const result = await discoverProductsFromImage(
      { image: sampleImage },
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    // iPhone 15 Pro Max is in a different cluster (fingerprint), so it should be categorized as similar
    expect(result.similarProducts.length).toBe(1);
    expect(result.similarProducts[0].representative.brand).toBe("apple");
    expect(result.similarProducts[0].representative.model).toBe("iphone 15 pro max");
  });

  // Test 5: Alternative products reuse existing alternative logic
  test("5. Reuses existing buildExplainableRecommendation engine for alternatives", async () => {
    const recService = new MockRecognitionService();
    recService.setMockResult(sampleRecognition);

    const discEngine = new MockDiscoveryEngine();
    discEngine.setMockCandidates([candidateAmazonS24, candidateIphone15]);

    const result = await discoverProductsFromImage(
      { image: sampleImage },
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    expect(result.alternativeProducts).toBeDefined();
    // Should list iPhone 15 as an alternative since it is a similar product in the same category
    expect(result.alternativeProducts.length).toBeGreaterThanOrEqual(1);
    expect(result.alternativeProducts[0].product.brand).toBe("apple");
  });

  // Test 6: Image + user requirements reaches the existing recommendation pipeline
  test("6. Filters and scores candidates with custom user requirements", async () => {
    const recService = new MockRecognitionService();
    recService.setMockResult(sampleRecognition);

    const discEngine = new MockDiscoveryEngine();
    discEngine.setMockCandidates([candidateAmazonS24, candidateFlipkartS24]);

    // Request with user requirements (prefer Flipkart or under a specific price)
    const userRequirements = {
      explicitRequirements: [
        { attribute: "price", value: 94500, operator: "less_than" as const, isMandatory: true }
      ]
    };

    const result = await discoverProductsFromImage(
      { image: sampleImage, userRequirements },
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    expect(result.recommendationResult).toBeDefined();
    // S24 Flipkart is 94000 (passes), S24 Amazon is 95000 (violates price constraint)
    // The recommendation engine should pick Flipkart as the recommended candidate
    expect(result.recommendationResult?.recommendedCandidate?.product.metadata?.marketplace).toBe("Flipkart");
  });

  // Test 7: Provider unavailable / recognition failure is safely handled
  test("7. Exits safely with empty results when provider is unavailable or recognition fails", async () => {
    const recService = new MockRecognitionService();
    // Simulate unavailable provider
    recService.setMockResult({
      status: "unavailable",
      category: null,
      brand: null,
      model: null,
      productType: null,
      visualAttributes: {},
      confidence: null,
      evidence: []
    });

    const discEngine = new MockDiscoveryEngine();

    const result = await discoverProductsFromImage(
      { image: sampleImage },
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    expect(result.status).toBe("unavailable");
    expect(result.matchedProducts).toEqual([]);
    expect(result.similarProducts).toEqual([]);
    expect(result.alternativeProducts).toEqual([]);
  });

  // Test 8: Determinism, purchase-URL safety, and input immutability
  test("8. Ensures outputs are deterministic, input objects unmutated, and URLs preserved", async () => {
    const recService = new MockRecognitionService();
    recService.setMockResult(sampleRecognition);

    const discEngine = new MockDiscoveryEngine();
    discEngine.setMockCandidates([candidateAmazonS24]);

    const requestObj = { image: sampleImage };
    const requestCopy = JSON.parse(JSON.stringify(requestObj));

    const result1 = await discoverProductsFromImage(
      requestObj,
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    const result2 = await discoverProductsFromImage(
      requestObj,
      { recognitionService: recService, discoveryEngine: discEngine }
    );

    // Outputs must be identical for the same input
    expect(result1).toEqual(result2);

    // Input objects must remain unmutated
    expect(requestObj).toEqual(requestCopy);

    // URLs and pricing must not be mutated or fabricated
    expect(result1.discoveredCandidates[0].originalUrl).toBe(candidateAmazonS24.url);
    expect(result1.discoveredCandidates[0].originalPrice).toBe(candidateAmazonS24.price);
  });
});
