/// <reference types="vite/client" />
import type { SearchProvider, SearchRequest, RawProductResult, SearchResult } from "./types";

// Safe development default, overrideable by Vite environment variables
const API_BASE_URL = import.meta.env?.VITE_CARTINTEL_API_URL || "http://localhost:3000";

export class CartIntelApiProvider implements SearchProvider {
  readonly id = "cartintel-backend-api";
  private readonly endpoint: string;

  constructor() {
    this.endpoint = `${API_BASE_URL}/api/search`;
  }

  async search(request: SearchRequest): Promise<RawProductResult[]> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000); // 8 second timeout

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request),
        signal: abortController.signal
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let data: SearchResult | { error: string };
      try {
        data = await response.json();
      } catch (err) {
        throw new Error("Malformed JSON response");
      }
      
      if ("error" in data) {
        throw new Error(`API Error: ${data.error}`);
      }

      if (data.results && Array.isArray(data.results)) {
        if (data.errors && data.errors.length > 0) {
          console.warn("CartIntel Backend returned partial errors:", data.errors);
        }
        console.log(`[Diagnostic 1] CartIntelApiProvider returning candidates: ${data.results.length}`);
        return data.results;
      }

      throw new Error("Malformed API response: 'results' array is missing");
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error("Backend request timed out after 8 seconds");
        }
        throw new Error(`Backend fetch failed: ${error.message}`);
      }
      throw new Error("Unknown backend communication error");
    }
  }
}
