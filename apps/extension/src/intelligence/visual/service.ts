import type { ImageInput, VisualProductRecognitionResult } from "./types";
import { type VisualRecognitionProvider, UnavailableVisualProvider, GeminiVisualProvider } from "./provider";

export class VisualProductRecognitionService {
  private providers = new Map<string, VisualRecognitionProvider>();
  private defaultProviderId: string | null = null;
  private fallbackProvider = new UnavailableVisualProvider();

  constructor() {
    // Register providers
    this.registerProvider(this.fallbackProvider);
    const gemini = new GeminiVisualProvider();
    this.registerProvider(gemini);
    // Set default provider to Gemini
    this.defaultProviderId = gemini.id;
  }

  registerProvider(provider: VisualRecognitionProvider): void {
    this.providers.set(provider.id, provider);
    if (!this.defaultProviderId || this.defaultProviderId === this.fallbackProvider.id) {
      this.defaultProviderId = provider.id;
    }
  }

  unregisterProvider(id: string): void {
    if (id === this.fallbackProvider.id) {
      return; // Cannot unregister the safety fallback
    }
    this.providers.delete(id);
    if (this.defaultProviderId === id) {
      this.defaultProviderId = this.fallbackProvider.id;
    }
  }

  setDefaultProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Visual recognition provider with ID '${id}' is not registered.`);
    }
    this.defaultProviderId = id;
  }

  getDefaultProviderId(): string | null {
    return this.defaultProviderId;
  }

  getRegisteredProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  async recognizeProductFromImage(
    image: ImageInput,
    options?: { providerId?: string }
  ): Promise<VisualProductRecognitionResult> {
    const providerId = options?.providerId || this.defaultProviderId || this.fallbackProvider.id;
    let provider = this.providers.get(providerId);

    if (!provider || !provider.isAvailable()) {
      // Fallback to the default provider if the selected one is missing or unavailable
      const defaultProvider = this.defaultProviderId ? this.providers.get(this.defaultProviderId) : null;
      if (defaultProvider && defaultProvider.isAvailable()) {
        provider = defaultProvider;
      } else {
        provider = this.fallbackProvider;
      }
    }

    // Keep function deterministic and protect input immutability by deep-copying the input parameters
    const deepCopyInput = JSON.parse(JSON.stringify(image)) as ImageInput;

    try {
      const rawResult = await provider.recognize(deepCopyInput);

      // Construct a valid VisualProductRecognitionResult contract and guarantee structure
      return {
        status: rawResult.status ?? "unknown",
        category: rawResult.category ?? null,
        brand: rawResult.brand ?? null,
        model: rawResult.model ?? null,
        productType: rawResult.productType ?? null,
        visualAttributes: rawResult.visualAttributes
          ? { ...rawResult.visualAttributes }
          : {},
        confidence: typeof rawResult.confidence === "number" ? rawResult.confidence : null,
        evidence: Array.isArray(rawResult.evidence)
          ? rawResult.evidence.map((ev) => ({ ...ev }))
          : [],
        rawResponse: rawResult.rawResponse,
      };
    } catch (error) {
      return {
        status: "unknown",
        category: null,
        brand: null,
        model: null,
        productType: null,
        visualAttributes: {},
        confidence: 0,
        evidence: [
          {
            source: "other",
            description: `Recognition failed: ${error instanceof Error ? error.message : String(error)}`,
            confidence: 0,
          },
        ],
      };
    }
  }
}
