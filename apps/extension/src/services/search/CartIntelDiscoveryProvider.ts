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
}
