import type { ImageInput, VisualProductRecognitionResult } from "./types";
import { normalizeVisualConfidence } from "./types";

export interface VisualRecognitionProvider {
  id: string;
  name: string;
  isAvailable(): boolean;
  recognize(image: ImageInput): Promise<VisualProductRecognitionResult>;
}

export class UnavailableVisualProvider implements VisualRecognitionProvider {
  readonly id = "unavailable_fallback";
  readonly name = "Unavailable Fallback Provider";

  isAvailable(): boolean {
    return false;
  }

  async recognize(_image: ImageInput): Promise<VisualProductRecognitionResult> {
    return {
      status: "unavailable",
      category: null,
      brand: null,
      model: null,
      productType: null,
      visualAttributes: {},
      confidence: null,
      evidence: [
        {
          source: "other",
          description: "Visual recognition provider is unavailable or not configured."
        }
      ]
    };
  }
}

const API_BASE_URL = import.meta.env?.VITE_CARTINTEL_API_URL || "http://localhost:3000";

async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  if (typeof window === "undefined" || typeof FileReader === "undefined") {
    return null; // Return null safely in Node.js test environment
  }
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        const mimeType = blob.type || "image/jpeg";
        resolve({ base64, mimeType });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert image URL to base64 in extension:", url, error);
    return null;
  }
}

export class GeminiVisualProvider implements VisualRecognitionProvider {
  readonly id = "gemini_visual_provider";
  readonly name = "Google Gemini Vision Provider";

  isAvailable(): boolean {
    return true; // Active on backend, reports error or falls back gracefully if key is missing
  }

  async recognize(image: ImageInput): Promise<VisualProductRecognitionResult> {
    console.log("[Visual] Gemini provider invoked");
    try {
      const payloadImages: Array<{ url?: string | null; base64?: string | null; mimeType?: string | null }> = [];

      // Process input (support single image or multiple images in batch format)
      const inputImages = image.images && image.images.length > 0 ? image.images : [image];

      for (const img of inputImages) {
        if (img.base64 && img.mimeType) {
          payloadImages.push({
            base64: img.base64,
            mimeType: img.mimeType
          });
        } else if (img.url) {
          if (img.url.startsWith("data:")) {
            const parts = img.url.split(",");
            const mimeType = parts[0].split(";")[0].split(":")[1] || "image/jpeg";
            const base64 = parts[1];
            payloadImages.push({ base64, mimeType });
          } else {
            // Convert web URL to base64 for browser compatibility and privacy
            const base64Data = await imageUrlToBase64(img.url);
            if (base64Data) {
              payloadImages.push(base64Data);
            } else {
              // Fallback: pass URL as-is, backend will fetch it
              payloadImages.push({ url: img.url });
            }
          }
        }
      }

      if (payloadImages.length === 0) {
        return {
          status: "unavailable",
          category: null,
          brand: null,
          model: null,
          productType: null,
          visualAttributes: {},
          confidence: null,
          evidence: [
            {
              source: "other",
              description: "No valid images could be prepared for visual recognition."
            }
          ]
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      console.log("[Visual] POST /api/visual");
      const response = await fetch(`${API_BASE_URL}/api/visual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ images: payloadImages }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as VisualProductRecognitionResult;

      const validStatus = ["recognized", "partially_recognized", "uncertain", "unknown", "unavailable"];
      if (!result || !validStatus.includes(result.status)) {
        throw new Error("Malformed visual recognition response status.");
      }

      // Canonical confidence normalization
      result.confidence = normalizeVisualConfidence(result.confidence);
      if (Array.isArray(result.evidence)) {
        result.evidence = result.evidence.map((ev) => ({
          ...ev,
          confidence: normalizeVisualConfidence(ev.confidence)
        }));
      }

      console.log("[VisualTrace] Gemini result:", result.status, result.category, result.brand, result.model, "confidence:", result.confidence);
      return result;
    } catch (error) {
      console.error("GeminiVisualProvider recognition failed:", error);
      return {
        status: "unavailable",
        category: null,
        brand: null,
        model: null,
        productType: null,
        visualAttributes: {},
        confidence: null,
        evidence: [
          {
            source: "other",
            description: `Visual recognition provider is unavailable. Gemini API connection error: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
}

