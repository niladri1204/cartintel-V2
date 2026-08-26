/// <reference types="vite/client" />
import type {
  SearchProvider,
  SearchRequest,
  SearchResponse,
} from "./searchProvider";

import type {
  SearchResult,
  ProviderError,
} from "./types";

// Safe development default, overrideable by Vite environment variables
const API_BASE_URL =
  import.meta.env?.VITE_CARTINTEL_API_URL || "http://localhost:3000";

export class CartIntelDiscoveryProvider implements SearchProvider {
  readonly name = "cartintel-backend-discovery";

  async search(request: SearchRequest): Promise<SearchResponse> {
    // Note: request.maxResults is currently not exposed or handled by the backend /api/search contract,
    // so it is intentionally left unused in this adapter to avoid inventing backend behavior.

    const endpoint = `${API_BASE_URL}/api/search`;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000); // 8 second timeout

    try {
      const payload = {
        normalizedTitle: request.query.query,
        fingerprint: `query:${request.query.query}`,
        googleProductId: (request as any).googleProductId,
        googleImmersiveToken: (request as any).googleImmersiveToken,
        useSellerExpansion: (request as any).useSellerExpansion,
        searchContext: {
          query: request.query.query,
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let errorData: { error?: string } | undefined;
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parse error for non-ok response
        }

        if (errorData?.error) {
          throw new Error(`API Error: ${errorData.error}`);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      let data: SearchResult | { error?: string };
      try {
        data = (await response.json()) as SearchResult;
      } catch {
        throw new Error("Malformed JSON response");
      }

      if ("error" in data && data.error && !("results" in data && Array.isArray(data.results))) {
        throw new Error(`API Error: ${data.error}`);
      }

      if (!data || !("results" in data) || !Array.isArray(data.results)) {
        throw new Error(
          "Malformed API response: 'results' array is missing or not an array"
        );
      }

      let combinedError: string | undefined;
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        combinedError = data.errors
          .map((e: ProviderError) => `${e.providerId}: ${e.error}`)
          .join(" | ");
      }

      // Boundary B URL Trace
      for (const result of data.results) {
        if (result.url) {
          let host = "none";
          try {
            host = new URL(result.url).hostname;
          } catch {}
          console.log(
            `[URLTrace:ExtensionReceive] merchant=${result.source} hasUrl=${Boolean(result.url)} host=${host}`
          );
        }
      }

      return {
        query: request.query,
        products: data.results,
        provider: this.name,
        searchedAt: new Date().toISOString(),
        ...(combinedError ? { error: combinedError } : {}),
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Backend request timed out after 8 seconds");
        }
        throw error;
      }
      throw new Error("Unknown backend communication error");
    }
  }

  /**
   * Enriches only the final decision-eligible offers with direct merchant URLs
   * via a single targeted organic query on the backend.
   */
  async resolveMerchantUrls(
    candidates: { product: any }[],
    contextProduct: any
  ): Promise<void> {
    const rawOffers = candidates
      .map(c => c.product)
      .filter((p: any) => Boolean(p && !p.originalUrl));

    if (rawOffers.length === 0) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const payload = {
        normalizedTitle: contextProduct.normalizedTitle || contextProduct.originalTitle || "",
        brand: contextProduct.brand || undefined,
        model: contextProduct.model || undefined,
        storage: contextProduct.storage || undefined,
        ram: contextProduct.ram || undefined,
        offers: rawOffers.map((p: any) => ({
          title: p.originalTitle || p.normalizedTitle || "",
          source: p.metadata?.marketplace || p.source || "unknown",
          marketplace: p.metadata?.marketplace || p.source || "unknown",
          price: p.originalPrice || 0,
          currency: p.originalCurrency || "INR",
          url: p.originalUrl || "",
        })),
      };

      const response = await fetch(`${API_BASE_URL}/api/search/resolve-urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.resolvedOffers)) {
          for (const resolved of data.resolvedOffers) {
            if (resolved.url) {
              const matchedCand = candidates.find(
                c =>
                  c.product &&
                  (c.product.metadata?.marketplace === resolved.source ||
                    c.product.source === resolved.source) &&
                  (c.product.originalPrice === resolved.price || !c.product.originalPrice)
              );
              if (matchedCand && matchedCand.product && !matchedCand.product.originalUrl) {
                matchedCand.product.originalUrl = resolved.url;
              }
            }
          }
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn("[CartIntelDiscoveryProvider] Direct URL enrichment failed gracefully:", err);
    }
  }
}
