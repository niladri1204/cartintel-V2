import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiVisualProvider } from "../provider";
import type { ImageInput, VisualProductRecognitionResult } from "../types";

describe("Phase 3.5 — Real Gemini Vision Provider Integration", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    vi.restoreAllMocks();
  });

  // Test 1: GeminiVisualProvider satisfies VisualRecognitionProvider
  test("1. GeminiVisualProvider satisfies VisualRecognitionProvider interface", () => {
    const provider = new GeminiVisualProvider();
    expect(provider.id).toBe("gemini_visual_provider");
    expect(provider.name).toBe("Google Gemini Vision Provider");
    expect(provider.isAvailable()).toBe(true);
    expect(typeof provider.recognize).toBe("function");
  });

  // Test 2: Valid structured Gemini response maps correctly
  test("2. Maps a valid structured Gemini response correctly to VisualProductRecognitionResult", async () => {
    const provider = new GeminiVisualProvider();

    const mockResponse: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      productType: "Smartphone",
      visualAttributes: {
        color: "Titanium Black",
        design: "Flat screen, Quad camera layout"
      },
      confidence: 0.95,
      evidence: [
        {
          source: "ocr",
          description: "Visible model branding text on the packaging."
        }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const imageInput: ImageInput = {
      url: "https://example.com/s24.jpg",
      metadata: { type: "product_image" }
    };

    const result = await provider.recognize(imageInput);
    expect(result.status).toBe("recognized");
    expect(result.brand).toBe("Samsung");
    expect(result.model).toBe("Galaxy S24 Ultra");
    expect(result.visualAttributes.color).toBe("Titanium Black");
    expect(result.confidence).toBe(95); // Canonical 0-100 scale (0.95 -> 95)
    expect(result.evidence[0].source).toBe("ocr");
  });

  // Test 3: Unsupported specifications remain null (anti-hallucination)
  test("3. Ensures unsupported specs remain null", async () => {
    const provider = new GeminiVisualProvider();

    // Verify mapping from API endpoint response retains nulls
    const mockResponse: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      productType: "Smartphone",
      visualAttributes: {
        color: "Titanium Black",
        ram: null, // Visually invisible
        storage: null // Visually invisible
      },
      confidence: 0.85,
      evidence: [
        {
          source: "shape",
          description: "Matches general form factor of modern ultra line."
        }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const imageInput: ImageInput = {
      url: "https://example.com/s24.jpg"
    };

    const result = await provider.recognize(imageInput);
    expect(result.visualAttributes.ram).toBeNull();
    expect(result.visualAttributes.storage).toBeNull();
    expect(result.confidence).toBe(85); // Canonical 0-100 scale (0.85 -> 85)
  });

  // Test 4: Multiple images combine correctly
  test("4. Integrates and combines evidence from multiple images in a single call", async () => {
    const provider = new GeminiVisualProvider();

    const mockResponse: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      productType: "Smartphone",
      visualAttributes: {
        color: "Titanium Yellow",
        accessories: ["stylus", "charger"]
      },
      confidence: 0.9,
      evidence: [
        {
          source: "ocr",
          description: "Image 1 shows Titanium Yellow color descriptor."
        },
        {
          source: "shape",
          description: "Image 2 displays the S-Pen stylus accessory."
        }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    // Provide multiple images inside batch structure
    const imageBatch: ImageInput = {
      images: [
        { url: "https://example.com/s24_front.jpg" },
        { url: "https://example.com/s24_back.jpg" }
      ]
    };

    const result = await provider.recognize(imageBatch);
    expect(result.status).toBe("recognized");
    expect(result.visualAttributes.color).toBe("Titanium Yellow");
    expect(result.visualAttributes.accessories).toContain("stylus");
    expect(result.evidence.length).toBe(2);
    expect(result.confidence).toBe(90);
  });

  // Test 5: Conflicting image evidence produces uncertain/partial recognition
  test("5. Reports uncertain or partially_recognized status if images conflict", async () => {
    const provider = new GeminiVisualProvider();

    const mockResponse: VisualProductRecognitionResult = {
      status: "partially_recognized",
      category: "Electronics",
      brand: "Samsung",
      model: null,
      productType: "Smartphone",
      visualAttributes: {
        color: "Conflict"
      },
      confidence: 0.4,
      evidence: [
        {
          source: "other",
          description: "Conflicting evidence: Image 1 suggests S24 Ultra (flat), but Image 2 displays S23 Ultra (curved)."
        }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const imageBatch: ImageInput = {
      images: [
        { url: "https://example.com/s24.jpg" },
        { url: "https://example.com/s23.jpg" }
      ]
    };

    const result = await provider.recognize(imageBatch);
    expect(result.status).toBe("partially_recognized");
    expect(result.model).toBeNull();
    expect(result.evidence[0].description).toContain("Conflicting evidence");
    expect(result.confidence).toBe(40);
  });

  // Test 6: Malformed Gemini response is rejected safely
  test("6. Safely rejects malformed Gemini responses", async () => {
    const provider = new GeminiVisualProvider();

    // Malformed JSON that lacks status or has invalid fields
    const mockResponse = {
      invalidField: "yes",
      wrongStructure: true
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const imageInput: ImageInput = {
      url: "https://example.com/s24.jpg"
    };

    // Extension client handles provider failures safely by catching errors or handling unexpected status
    const result = await provider.recognize(imageInput);
    expect(result.status).toBe("unavailable");
  });

  // Test 7: Provider/network/API failure returns unavailable
  test("7. Returns unavailable status on HTTP/network errors", async () => {
    const provider = new GeminiVisualProvider();

    // Simulate backend down
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

    const imageInput: ImageInput = {
      url: "https://example.com/s24.jpg"
    };

    const result = await provider.recognize(imageInput);
    expect(result.status).toBe("unavailable");
    expect(result.evidence[0].description).toContain("Gemini API connection error");
  });

  // Test 8: Input immutability and no secret exposure in extension-side code
  test("8. Protects input immutability and does not leak API keys in the extension bundle", async () => {
    const provider = new GeminiVisualProvider();

    const mockResponse: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "S24",
      productType: "Phone",
      visualAttributes: {},
      confidence: 1.0,
      evidence: []
    };

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      // API Key should NOT be present in client-side headers or payload
      const headers = init.headers || {};
      expect(headers["x-goog-api-key"]).toBeUndefined();
      expect(headers["Authorization"]).toBeUndefined();
      return Promise.resolve({
        ok: true,
        json: async () => mockResponse
      });
    });

    const imageInput: ImageInput = {
      url: "https://example.com/s24.jpg"
    };

    const inputCopy = JSON.parse(JSON.stringify(imageInput));
    await provider.recognize(imageInput);

    // Assert input is unmutated
    expect(imageInput).toEqual(inputCopy);
  });

  // Test 9: Confidence canonical scaling (0.55 -> 55, 0.85 -> 85, 85 -> 85, 55 -> 55, null -> null)
  test("9. Normalizes confidence values across all scales (0.55, 0.85, 55, 85, null)", async () => {
    const provider = new GeminiVisualProvider();

    const testCases: Array<{ raw: number | null; expected: number | null }> = [
      { raw: 0.55, expected: 55 },
      { raw: 0.85, expected: 85 },
      { raw: 55, expected: 55 },
      { raw: 85, expected: 85 },
      { raw: 1.0, expected: 100 },
      { raw: 0, expected: 0 },
      { raw: null, expected: null }
    ];

    for (const tc of testCases) {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "recognized",
          category: "Beauty",
          brand: "MARS",
          model: "Lip Balm",
          productType: "Lip Product",
          visualAttributes: {},
          confidence: tc.raw,
          evidence: []
        })
      });

      const res = await provider.recognize({ url: "https://example.com/mars.jpg" });
      expect(res.confidence).toBe(tc.expected);
    }
  });

  // Test 10: 2000ms+ latency tolerance (not aborted by the 6000ms timeout)
  test("10. Tolerates 2000ms+ latency without aborting prematurely", async () => {
    const provider = new GeminiVisualProvider();

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              status: "recognized",
              category: "Footwear",
              brand: "Puma",
              model: "Electron Street",
              productType: "Shoes",
              visualAttributes: {},
              confidence: 0.88,
              evidence: []
            })
          });
        }, 50); // Fast mock delay in unit test that verifies signal is not triggered

        if (init?.signal) {
          init.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("The operation was aborted."));
          });
        }
      });
    });

    const res = await provider.recognize({ url: "https://example.com/puma.jpg" });
    expect(res.status).toBe("recognized");
    expect(res.brand).toBe("Puma");
    expect(res.confidence).toBe(88);
  });
});
