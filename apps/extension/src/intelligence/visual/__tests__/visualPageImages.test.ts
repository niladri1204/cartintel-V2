import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { extractPageImages, parseSrcset } from "../pageImages";
import { prepareVisualComparison } from "../visualComparison";
import { discoverProductsFromPage } from "../discovery";
import { VisualProductRecognitionService } from "../service";
import type { VisualProductRecognitionResult } from "../types";
import { DiscoveryEngine } from "../../../services/search/discoveryEngine";

// Lightweight Mock DOM elements for testability
class MockElement {
  tagName: string;
  private attributes: Record<string, string> = {};
  private parent: MockElement | null = null;

  constructor(tagName: string, attributes?: Record<string, string>) {
    this.tagName = tagName;
    if (attributes) {
      for (const [key, val] of Object.entries(attributes)) {
        this.attributes[key] = val;
      }
    }
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }

  setParent(parent: MockElement) {
    this.parent = parent;
  }

  get parentElement(): MockElement | null {
    return this.parent;
  }

  matches(selector: string): boolean {
    if (selector.startsWith("#") && this.getAttribute("id") === selector.slice(1)) return true;
    if (selector.startsWith(".") && (this.getAttribute("class") || "").includes(selector.slice(1))) return true;
    if (selector.startsWith("[") && selector.endsWith("]")) {
      const match = selector.slice(1, -1).split("=");
      const name = match[0];
      const val = match[1]?.replace(/['"]/g, "");
      return val ? this.getAttribute(name) === val : this.getAttribute(name) !== null;
    }
    return false;
  }
}

class MockDocument {
  title: string = "";
  baseURI: string = "https://example.com/product/123";
  elements: MockElement[] = [];

  constructor(title?: string) {
    if (title) this.title = title;
  }

  createElement(tagName: string, attributes?: Record<string, string>): MockElement {
    const el = new MockElement(tagName, attributes);
    this.elements.push(el);
    return el;
  }

  querySelectorAll(selector: string): MockElement[] {
    if (selector === "img") {
      return this.elements.filter((el) => el.tagName === "img");
    }
    if (selector === "picture source") {
      return this.elements.filter((el) => el.tagName === "source");
    }
    return [];
  }
}

// Mock VisualProductRecognitionService
class MockRecognitionService extends VisualProductRecognitionService {
  private mockResult: VisualProductRecognitionResult | null = null;

  setMockResult(result: VisualProductRecognitionResult | null) {
    this.mockResult = result;
  }

  override async recognizeProductFromImage(
    _image: any,
    _options?: any
  ): Promise<VisualProductRecognitionResult> {
    if (this.mockResult) return this.mockResult;
    return {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      productType: "Smartphone",
      visualAttributes: { color: "Titanium" },
      confidence: 0.95,
      evidence: []
    };
  }
}

// Mock DiscoveryEngine to bypass queries
class MockDiscoveryEngine extends DiscoveryEngine {
  constructor() {
    super({} as any);
  }

  override async discover(_input: any): Promise<any> {
    return {
      queries: [{ query: "Mock S24", provider: "Mock", searchedAt: new Date().toISOString() }],
      candidates: [
        {
          title: "Samsung Galaxy S24 Ultra 5G (Titanium, 12GB RAM, 256GB)",
          price: 95000,
          currency: "INR",
          source: "Amazon",
          url: "https://www.amazon.in/dp/123"
        }
      ]
    };
  }
}

describe("Phase 3.4 — Automatic Webpage Image Acquisition & Visual Comparison", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1787305332200));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 1: Product image extraction from normal <img> elements
  test("1. Extracts product images from standard <img> tags correctly", () => {
    const doc = new MockDocument("Samsung Galaxy S24 Ultra");
    doc.createElement("img", {
      src: "https://example.com/s24_main.jpg",
      alt: "Samsung Galaxy S24 Ultra Main Image",
      width: "600",
      height: "600"
    });

    const result = extractPageImages(doc);
    expect(result.length).toBe(1);
    expect(result[0].url).toBe("https://example.com/s24_main.jpg");
    expect(result[0].source).toBe("img");
    expect(result[0].width).toBe(600);
    expect(result[0].height).toBe(600);
    expect(result[0].alt).toBe("Samsung Galaxy S24 Ultra Main Image");
    expect(result[0].isLikelyProductImage).toBe(true);
  });

  // Test 2: srcset/lazy-loaded image handling
  test("2. Handles srcset parsing and lazy-loaded image attributes", () => {
    const doc = new MockDocument("Samsung Galaxy S24 Ultra");
    
    // Test srcset parser directly
    const parsedSrcset = parseSrcset("s24_300w.jpg 300w, s24_1000w.jpg 1000w");
    expect(parsedSrcset).toEqual({ url: "s24_1000w.jpg", width: 1000 });

    // Test extraction from element with srcset and lazy-load data-src
    doc.createElement("img", {
      src: "s24_small.jpg",
      "data-src": "https://example.com/s24_hires.jpg",
      srcset: "s24_300w.jpg 300w, s24_1000w.jpg 1000w"
    });

    const result = extractPageImages(doc);
    // Should extract both data-src option and srcset option, deduplicate, and prefer hires
    expect(result.length).toBeGreaterThan(0);
    const urls = result.map((r) => r.url);
    expect(urls).toContain("https://example.com/s24_hires.jpg");
  });

  // Test 3: Non-product image filtering
  test("3. Filters out non-product elements like logos, navigation, and banners", () => {
    const doc = new MockDocument("Samsung Galaxy S24 Ultra");
    
    // Valid product image
    const mainImg = doc.createElement("img", {
      src: "https://example.com/s24_phone.jpg",
      alt: "Samsung Galaxy S24 Ultra Product Image",
      width: "500",
      height: "500"
    });
    const mainParent = doc.createElement("div", { class: "product-gallery" });
    mainImg.setParent(mainParent);

    // Decorative / non-product elements
    doc.createElement("img", {
      src: "https://example.com/samsung_logo.png",
      alt: "Samsung Logo",
      width: "80",
      height: "20"
    });

    doc.createElement("img", {
      src: "https://example.com/cart_icon.svg",
      alt: "Cart Icon",
      width: "30",
      height: "30"
    });

    doc.createElement("img", {
      src: "https://example.com/banner_ad.gif",
      alt: "Super Special Banner Ad",
      width: "900",
      height: "150"
    });

    const result = extractPageImages(doc);
    
    // Logos and icons should have extremely low scores and not be marked as likely product images
    const likelyImages = result.filter((r) => r.isLikelyProductImage);
    expect(likelyImages.length).toBe(1);
    expect(likelyImages[0].url).toBe("https://example.com/s24_phone.jpg");
  });

  // Test 4: Duplicate image removal
  test("4. Deduplicates duplicate elements prioritizing highest-resolution choices", () => {
    const doc = new MockDocument("Samsung Galaxy S24 Ultra");
    
    // Duplicate URL paths with different resizing query params or sources
    doc.createElement("img", {
      src: "https://example.com/s24_ultra.jpg?size=thumbnail",
      width: "150",
      height: "150"
    });

    doc.createElement("img", {
      src: "https://example.com/s24_ultra.jpg?size=large",
      width: "1000",
      height: "1000"
    });

    const result = extractPageImages(doc);
    expect(result.length).toBe(1);
    expect(result[0].width).toBe(1000); // Higher resolution variant is preserved
  });

  // Test 5: Product image relevance ranking
  test("5. Ranks images by relevance score based on size, title overlap, and selectors", () => {
    const doc = new MockDocument("Galaxy S24 Ultra Phone");

    // Candidate 1: High relevance main image
    const mainImg = doc.createElement("img", {
      src: "https://example.com/s24.jpg",
      alt: "Galaxy S24 Ultra smartphone front display view",
      width: "600",
      height: "600"
    });
    mainImg.setAttribute("id", "landingImage");

    // Candidate 2: Medium relevance gallery thumbnail
    const thumbImg = doc.createElement("img", {
      src: "https://example.com/thumb.jpg",
      alt: "Gallery view thumbnail",
      width: "120",
      height: "120"
    });
    const galleryParent = doc.createElement("div", { class: "product-gallery" });
    thumbImg.setParent(galleryParent);

    const result = extractPageImages(doc);
    expect(result.length).toBe(2);
    // Main image with selector match + title words overlap + square dimensions must rank 1st
    expect(result[0].url).toBe("https://example.com/s24.jpg");
    expect(result[0].relevanceScore).toBeGreaterThan(result[1].relevanceScore);
  });

  // Test 6: Automatic page-image → visual service integration boundary
  test("6. Automatically orchestrates page extraction → recognition service flow", async () => {
    const doc = new MockDocument("Samsung Galaxy S24 Ultra");
    doc.createElement("img", {
      src: "https://example.com/phone.jpg",
      alt: "Samsung Galaxy S24 Ultra Phone",
      width: "500",
      height: "500"
    });

    const mockService = new MockRecognitionService();
    const mockEngine = new MockDiscoveryEngine();

    const result = await discoverProductsFromPage(doc, {
      recognitionService: mockService,
      discoveryEngine: mockEngine
    });

    expect(result.status).toBe("success");
    expect(result.recognition).toBeDefined();
    expect(result.recognition?.brand).toBe("Samsung");
    expect(result.recognition?.model).toBe("Galaxy S24 Ultra");
    expect(result.discoveredCandidates.length).toBe(1);
  });

  // Test 7: No-provider/unavailable safety
  test("7. Gracefully handles no provider configuration or unavailable provider state", async () => {
    const doc = new MockDocument("Samsung Galaxy S24 Ultra");
    doc.createElement("img", {
      src: "https://example.com/phone.jpg",
      alt: "Samsung Galaxy S24 Ultra Phone",
      width: "500",
      height: "500"
    });

    const mockService = new MockRecognitionService();
    // Configure provider is unavailable
    mockService.setMockResult({
      status: "unavailable",
      category: null,
      brand: null,
      model: null,
      productType: null,
      visualAttributes: {},
      confidence: null,
      evidence: []
    });

    const result = await discoverProductsFromPage(doc, {
      recognitionService: mockService
    });

    expect(result.status).toBe("unavailable");
    expect(result.matchedProducts).toEqual([]);
    expect(result.similarProducts).toEqual([]);
    expect(result.alternativeProducts).toEqual([]);
  });

  // Test 8: Determinism and input immutability
  test("8. Ensures page extraction and discovery returns deterministic results", async () => {
    const doc = new MockDocument("Samsung Galaxy S24 Ultra");
    doc.createElement("img", {
      src: "https://example.com/phone.jpg",
      alt: "Samsung Galaxy S24 Ultra Phone",
      width: "500",
      height: "500"
    });

    const mockService = new MockRecognitionService();
    const mockEngine = new MockDiscoveryEngine();

    const requestCopy = JSON.parse(JSON.stringify(doc));

    const result1 = await discoverProductsFromPage(doc, {
      recognitionService: mockService,
      discoveryEngine: mockEngine
    });

    const result2 = await discoverProductsFromPage(doc, {
      recognitionService: mockService,
      discoveryEngine: mockEngine
    });

    expect(result1).toEqual(result2); // Output is identical
    expect(JSON.parse(JSON.stringify(doc))).toEqual(requestCopy); // Input is unmutated
  });

  // Test 9: Visual comparison unavailable contract
  test("9. Safe unavailable contract for visual comparison preparation module", () => {
    const pageImage = {
      url: "https://example.com/phone.jpg",
      source: "img",
      width: 500,
      height: 500,
      alt: "Samsung Galaxy S24 Ultra Phone",
      relevanceScore: 90,
      isLikelyProductImage: true
    };

    const candidate = {
      originalTitle: "Samsung Galaxy S24 Ultra 5G (Titanium, 12GB RAM, 256GB)",
      originalPrice: 95000,
      originalCurrency: "INR",
      originalImage: "https://example.com/candidate_s24.jpg",
      originalUrl: "https://www.amazon.in/dp/123",
      brand: "samsung",
      model: "galaxy s24 ultra",
      category: "Electronics",
      productType: "Smartphone",
      color: "titanium",
      normalizedTitle: "samsung galaxy s24 ultra 5g (titanium, 12gb ram, 256gb)",
      confidence: 100,
      fingerprint: "samsung|galaxy s24 ultra|256gb|12gb|titanium",
      metadata: {
        marketplace: "Amazon",
        hostname: "www.amazon.in",
        detectedAt: Date.now()
      }
    };

    const compResult = prepareVisualComparison(pageImage, candidate);
    expect(compResult.sourceImage).toBe("https://example.com/phone.jpg");
    expect(compResult.candidateImage).toBe("https://example.com/candidate_s24.jpg");
    expect(compResult.similarityScore).toBeNull(); // Must be null when unavailable
    expect(compResult.confidence).toBeNull(); // Must be null when unavailable
    expect(compResult.evidence[0]).toContain("Visual comparison provider is unavailable");
  });
});
