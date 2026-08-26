import { describe, test, expect } from "vitest";
import type { ImageInput, VisualProductRecognitionResult } from "../types";
import type { VisualRecognitionProvider } from "../provider";
import { VisualProductRecognitionService } from "../service";

class MockVisualProvider implements VisualRecognitionProvider {
  readonly id = "mock_vision_provider";
  readonly name = "Mock Vision Provider";
  private available = true;

  setAvailable(available: boolean) {
    this.available = available;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async recognize(image: ImageInput): Promise<VisualProductRecognitionResult> {
    if (!this.available) {
      throw new Error("Provider not available");
    }

    const filename = image.metadata?.filename || "";
    const type = image.metadata?.type;

    // Handle unknown/ambiguous case
    if (filename.includes("blurry") || filename.includes("unknown") || (!image.url && !image.base64)) {
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

    // Handle Electronics first support - S24 Ultra
    if (filename.includes("s24ultra") || image.url?.includes("s24ultra")) {
      return {
        status: "recognized",
        category: "Electronics",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        productType: "Smartphone",
        visualAttributes: {
          color: "Titanium Gray",
          formFactor: "Bar",
          cameraSpecs: "Quad Camera Layout",
          design: "Flat edges",
          visualCategory: "mobile_phone"
        },
        confidence: 0.95,
        evidence: [
          { source: "logo", description: "Samsung brand marking on rear", confidence: 0.9 },
          { source: "shape", description: "Characteristic camera layout and squared corners", confidence: 0.95 }
        ]
      };
    }

    // Handle screenshot-style input
    if (type === "shopping_page_screenshot") {
      return {
        status: "partially_recognized",
        category: "Electronics",
        brand: "Apple",
        model: "iPhone 15 Pro",
        productType: "Smartphone",
        visualAttributes: {
          color: "Natural Titanium",
          formFactor: "Bar",
          design: "Dynamic Island visible"
        },
        confidence: 0.85,
        evidence: [
          { source: "ocr", description: "Detected text 'iPhone 15 Pro' in main region", confidence: 0.9 },
          { source: "layout", description: "Product display region isolated from page header and side navigation", confidence: 0.8 }
        ]
      };
    }

    return {
      status: "recognized",
      category: "Home & Kitchen",
      brand: "MockBrand",
      model: "MockModel",
      productType: "Appliance",
      visualAttributes: {
        color: "White"
      },
      confidence: 0.9,
      evidence: []
    };
  }
}

describe("Phase 3.1 — Visual Product Recognition Foundation", () => {
  // Test 1: Recognition contract creation
  test("1. Recognition contract structure and defaults", () => {
    const result: VisualProductRecognitionResult = {
      status: "unknown",
      category: null,
      brand: null,
      model: null,
      productType: null,
      visualAttributes: {},
      confidence: null,
      evidence: []
    };

    expect(result.status).toBe("unknown");
    expect(result.category).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.model).toBeNull();
    expect(result.productType).toBeNull();
    expect(result.visualAttributes).toEqual({});
    expect(result.confidence).toBeNull();
    expect(result.evidence).toEqual([]);
  });

  // Test 2: Electronics product recognition result structure
  test("2. Electronics product recognition result structure", async () => {
    const service = new VisualProductRecognitionService();
    const provider = new MockVisualProvider();
    service.registerProvider(provider);
    service.setDefaultProvider(provider.id);

    const input: ImageInput = {
      url: "https://example.com/s24ultra.jpg",
      metadata: {
        type: "product_image",
        filename: "s24ultra_front.jpg"
      }
    };

    const result = await service.recognizeProductFromImage(input);

    expect(result.status).toBe("recognized");
    expect(result.category).toBe("Electronics");
    expect(result.brand).toBe("Samsung");
    expect(result.model).toBe("Galaxy S24 Ultra");
    expect(result.productType).toBe("Smartphone");
    expect(result.confidence).toBe(0.95);
  });

  // Test 3: Brand/model/product-type extraction from supported recognition output
  test("3. Extraction of main fields from visual output", async () => {
    const service = new VisualProductRecognitionService();
    const provider = new MockVisualProvider();
    service.registerProvider(provider);
    service.setDefaultProvider(provider.id);

    const input: ImageInput = {
      url: "https://example.com/s24ultra.jpg",
      metadata: { filename: "s24ultra.png" }
    };

    const result = await service.recognizeProductFromImage(input);

    // Assert that the exact brand, model, and category fields are extracted cleanly
    const extractedBrand = result.brand;
    const extractedModel = result.model;
    const extractedProductType = result.productType;

    expect(extractedBrand).toBe("Samsung");
    expect(extractedModel).toBe("Galaxy S24 Ultra");
    expect(extractedProductType).toBe("Smartphone");
  });

  // Test 4: Visual attribute handling
  test("4. Visual attribute schema correctness", async () => {
    const service = new VisualProductRecognitionService();
    const provider = new MockVisualProvider();
    service.registerProvider(provider);
    service.setDefaultProvider(provider.id);

    const input: ImageInput = {
      url: "https://example.com/s24ultra.jpg",
      metadata: { filename: "s24ultra.png" }
    };

    const result = await service.recognizeProductFromImage(input);

    expect(result.visualAttributes).toBeDefined();
    expect(result.visualAttributes.color).toBe("Titanium Gray");
    expect(result.visualAttributes.formFactor).toBe("Bar");
    expect(result.visualAttributes.cameraSpecs).toBe("Quad Camera Layout");
    expect(result.visualAttributes.design).toBe("Flat edges");
  });

  // Test 5: Unknown/ambiguous recognition safety
  test("5. Safety behavior with unknown or blurry inputs", async () => {
    const service = new VisualProductRecognitionService();
    const provider = new MockVisualProvider();
    service.registerProvider(provider);
    service.setDefaultProvider(provider.id);

    const input: ImageInput = {
      url: "https://example.com/blurry_image.jpg",
      metadata: { filename: "blurry_phone.jpg" }
    };

    const result = await service.recognizeProductFromImage(input);

    // Ambiguous and blurry images should safely return null/default results rather than guessing
    expect(result.status).toBe("unknown");
    expect(result.category).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.model).toBeNull();
    expect(result.productType).toBeNull();
    expect(result.visualAttributes).toEqual({});
  });

  // Test 6: Screenshot-style input handling
  test("6. Screenshot-style input handling (OCR and UI exclusion)", async () => {
    const service = new VisualProductRecognitionService();
    const provider = new MockVisualProvider();
    service.registerProvider(provider);
    service.setDefaultProvider(provider.id);

    const input: ImageInput = {
      base64: "iVBORw0KGgoAAAANSUhEUgAA...",
      metadata: {
        type: "shopping_page_screenshot",
        filename: "amazon_shopping_page.png"
      }
    };

    const result = await service.recognizeProductFromImage(input);

    expect(result.status).toBe("partially_recognized");
    expect(result.brand).toBe("Apple");
    expect(result.model).toBe("iPhone 15 Pro");
    expect(result.visualAttributes.design).toContain("Dynamic Island");
    expect(result.evidence.some(e => e.source === "ocr")).toBe(true);
    expect(result.evidence.some(e => e.source === "layout")).toBe(true);
  });

  // Test 7: Provider abstraction / unavailable-provider safety
  test("7. Fallback behavior when providers are unavailable", async () => {
    const service = new VisualProductRecognitionService();
    
    // Test default fallback provider when no other provider is registered or configured
    const input: ImageInput = { url: "https://example.com/phone.jpg" };
    const result = await service.recognizeProductFromImage(input);

    expect(result.status).toBe("unavailable");
    expect(result.brand).toBeNull();
    expect(result.model).toBeNull();
    expect(result.evidence[0].description).toContain("provider is unavailable");

    // Test when provider throws an availability error
    const provider = new MockVisualProvider();
    provider.setAvailable(false);
    service.registerProvider(provider);
    service.setDefaultProvider(provider.id);

    const resultWithUnavailableProvider = await service.recognizeProductFromImage(input);
    expect(resultWithUnavailableProvider.status).toBe("unavailable");
  });

  // Test 8: Immutability and deterministic result handling
  test("8. Input immutability and deterministic result handling", async () => {
    const service = new VisualProductRecognitionService();
    const provider = new MockVisualProvider();
    service.registerProvider(provider);
    service.setDefaultProvider(provider.id);

    const metadataObj = { type: "product_image" as const, filename: "s24ultra.jpg" };
    const input: ImageInput = {
      url: "https://example.com/s24ultra.jpg",
      metadata: metadataObj
    };

    const inputCopy = JSON.parse(JSON.stringify(input));

    // Call service twice to verify deterministic outputs
    const result1 = await service.recognizeProductFromImage(input);
    const result2 = await service.recognizeProductFromImage(input);

    expect(result1).toEqual(result2);

    // Verify input object and its nested metadata properties were not mutated
    expect(input).toEqual(inputCopy);
    expect(input.metadata).toBe(metadataObj); // strict identity check on metadata reference
  });
});
