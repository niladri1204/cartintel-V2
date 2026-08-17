import type { SearchProvider, SearchRequest, SearchResponse } from "../searchProvider";
import type { RawProductResult } from "../types";

export class SerpApiDiscoveryProvider implements SearchProvider {
  readonly name = "serpapi-google-shopping";

  private extractDirectMerchantUrl(
    link?: string,
    direct_link?: string
  ): string | null {
    const isInvalidHostname = (urlStr: string) => {
      try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        return (
          host.includes("google.com") ||
          host.includes("google.co.in") ||
          host.includes("serpapi.com")
        );
      } catch (e) {
        return true;
      }
    };

    const validateAndExtract = (urlStr: string): string | null => {
      if (!urlStr) return null;
      try {
        const parsed = new URL(urlStr);
        if (parsed.hostname.includes("google.com") && (parsed.pathname === "/url" || parsed.pathname === "/aclk" || parsed.pathname === "/search")) {
          const extractedUrl = parsed.searchParams.get("url") || parsed.searchParams.get("q") || parsed.searchParams.get("adurl");
          if (extractedUrl) {
            return validateAndExtract(extractedUrl);
          }
        }
        
        if (isInvalidHostname(urlStr)) return null;
        
        if (parsed.hostname.toLowerCase().includes("flipkart.com") && parsed.protocol === "http:") {
          parsed.protocol = "https:";
          return parsed.toString();
        }

        return urlStr;
      } catch {
        return null;
      }
    };

    if (direct_link) {
      const valid = validateAndExtract(direct_link);
      if (valid) return valid;
    }
    
    if (link) {
      const valid = validateAndExtract(link);
      if (valid) return valid;
    }

    return null;
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
      return {
        query: request.query,
        products: [],
        provider: this.name,
        searchedAt: new Date().toISOString(),
        error: "Missing SERPAPI_API_KEY environment variable",
      };
    }

    const queryStr = request.query.query;
    if (!queryStr || queryStr.trim() === "") {
      return {
        query: request.query,
        products: [],
        provider: this.name,
        searchedAt: new Date().toISOString(),
        error: "Empty search query",
      };
    }

    const params = new URLSearchParams({
      engine: "google_shopping",
      q: queryStr,
      gl: "in",
      hl: "en",
      api_key: apiKey
    });

    const url = `https://serpapi.com/search.json?${params.toString()}`;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000);

    let response;
    try {
      response = await fetch(url, { signal: abortController.signal });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`[SerpApiDiscovery] FAILURE | duration=${duration}ms | error="Network failure or timeout" | query="${queryStr}"`);
      return {
        query: request.query,
        products: [],
        provider: this.name,
        searchedAt: new Date().toISOString(),
        error: "Network failure or timeout",
      };
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const duration = Date.now() - startTime;
      console.log(`[SerpApiDiscovery] FAILURE | duration=${duration}ms | error="HTTP Error: ${response.status}" | query="${queryStr}"`);
      return {
        query: request.query,
        products: [],
        provider: this.name,
        searchedAt: new Date().toISOString(),
        error: `HTTP Error: ${response.status}`,
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`[SerpApiDiscovery] FAILURE | duration=${duration}ms | error="Malformed JSON response" | query="${queryStr}"`);
      return {
        query: request.query,
        products: [],
        provider: this.name,
        searchedAt: new Date().toISOString(),
        error: "Malformed JSON response",
      };
    }

    if (data.error) {
      const duration = Date.now() - startTime;
      console.log(`[SerpApiDiscovery] FAILURE | duration=${duration}ms | error="${data.error}" | query="${queryStr}"`);
      return {
        query: request.query,
        products: [],
        provider: this.name,
        searchedAt: new Date().toISOString(),
        error: data.error,
      };
    }

    const shoppingResults = data.shopping_results;
    if (!shoppingResults || !Array.isArray(shoppingResults)) {
      const duration = Date.now() - startTime;
      console.log(`[SerpApiDiscovery] SUCCESS | duration=${duration}ms | results=0 | query="${queryStr}"`);
      return {
        query: request.query,
        products: [],
        provider: this.name,
        searchedAt: new Date().toISOString(),
      };
    }

    let rawItems = shoppingResults;
    if (request.maxResults && request.maxResults > 0) {
      rawItems = rawItems.slice(0, request.maxResults);
    }

    const validResults: RawProductResult[] = [];
    const seenUrls = new Set<string>();

    for (let index = 0; index < rawItems.length; index++) {
      const item = rawItems[index];

      if (!item.title || !item.source) {
        continue;
      }

      const extractedPrice = item.extracted_price;
      const parsedPrice = extractedPrice ?? parseFloat(String(item.price || "").replace(/[^0-9.]/g, ''));

      const price =
        typeof parsedPrice === "number" &&
        Number.isFinite(parsedPrice) &&
        parsedPrice > 0
          ? parsedPrice
          : null;

      const googleLink = item.product_link || item.link;
      const directUrl = this.extractDirectMerchantUrl(item.link, item.direct_link);

      const urlToUse = directUrl ?? googleLink ?? "";
      if (!urlToUse) {
         continue; // Cannot use this result
      }

      const dedupeUrl = directUrl ?? googleLink ?? null;

      if (dedupeUrl) {
         if (seenUrls.has(dedupeUrl)) {
           continue; // Deduplicate by URL
         }
         seenUrls.add(dedupeUrl);
      }

      validResults.push({
        title: item.title,
        price,
        currency: item.currency ?? null,
        url: urlToUse,
        imageUrl: item.thumbnail || null,
        source: item.source,
        seller: undefined,
        availability: undefined,
        searchQuery: queryStr,
        searchRank: item.position ?? (index + 1),
        googleShoppingProductLink: googleLink || null,
        googleProductId: item.product_id,
        googleImmersiveToken: item.immersive_product_page_token,
        marketplace: item.source,
        marketplaceLogo: item.source_icon || null,
        rating: item.rating ? Number(item.rating) : undefined,
        deliveryInfo: item.delivery || undefined,
        discovery: {
          provider: this.name,
          queryType: request.query.type,
          retrievedAt: new Date().toISOString()
        }
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[SerpApiDiscovery] SUCCESS | duration=${duration}ms | results=${validResults.length} | query="${queryStr}"`);

    return {
      query: request.query,
      products: validResults,
      provider: this.name,
      searchedAt: new Date().toISOString(),
    };
  }
}
