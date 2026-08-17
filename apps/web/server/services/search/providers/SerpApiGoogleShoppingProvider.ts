import type { BackendSearchProvider } from "../index";
import type { SearchRequest, RawProductResult } from "../types";

export class SerpApiGoogleShoppingProvider implements BackendSearchProvider {
  readonly id = "serpapi-google-shopping";

  private buildQuery(request: SearchRequest): string {
    const parts: string[] = [];
    
    // Prioritize strong identity signals
    if (request.brand) parts.push(request.brand);
    if (request.model) parts.push(request.model);
    
    if (request.variant) parts.push(request.variant);
    if (request.storage) parts.push(request.storage);
    if (request.ram) parts.push(request.ram);
    
    // If we have strong signals, use them. Otherwise fallback to the normalized title.
    if (parts.length > 0) {
      return parts.join(" ");
    }
    
    return request.normalizedTitle || request.fingerprint.split('|').join(' ');
  }

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
        return true; // Invalid URL string
      }
    };

    const validateAndExtract = (urlStr: string): string | null => {
      if (!urlStr) return null;
      try {
        const parsed = new URL(urlStr);
        // Is it a Google redirect/tracking link?
        if (parsed.hostname.includes("google.com") && (parsed.pathname === "/url" || parsed.pathname === "/aclk" || parsed.pathname === "/search")) {
          const extractedUrl = parsed.searchParams.get("url") || parsed.searchParams.get("q") || parsed.searchParams.get("adurl");
          if (extractedUrl) {
            return validateAndExtract(extractedUrl); // recursively validate the extracted URL
          }
        }
        
        // If it's still Google Shopping or SerpApi, reject it
        if (isInvalidHostname(urlStr)) return null;
        
        // Normalize Flipkart HTTP to HTTPS if valid
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

  /**
   * Safe fetch wrapper with 15-second timeout and single-retry capability for transient network/latency spikes.
   */
  private async fetchWithTimeoutAndRetry(
    url: string,
    timeoutMs: number = 15000,
    maxRetries: number = 1
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (response.ok) {
          return response;
        }
        // If server returns 5xx or rate-limit, retry once if retries left
        if (attempt < maxRetries && (response.status >= 500 || response.status === 429)) {
          await new Promise(res => setTimeout(res, 500));
          continue;
        }
        return response;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, 500));
          continue;
        }
      }
    }
    console.error("[SerpApi] Network failure or Timeout after retries:", lastError);
    throw new Error("Network failure or Timeout while contacting SerpApi");
  }

  async search(request: SearchRequest): Promise<RawProductResult[]> {
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
      console.warn("SerpApiGoogleShoppingProvider: SERPAPI_API_KEY is not configured.");
      throw new Error("Provider configuration error: Missing API Key");
    }

    // PHASE 2: Fetch immersive sellers for an exact product
    if (request.googleProductId || request.googleImmersiveToken) {
        console.log("[8] Immersive Product request started");
        
        const sellers: any[] = [];
        let currentPageToken = request.googleImmersiveToken;
        const productId = request.googleProductId;
        let pageCount = 0;
        const maxPages = 3;

        while (pageCount < maxPages) {
          pageCount++;
          const fetchParams = new URLSearchParams({
            api_key: apiKey,
            gl: "in",
            hl: "en",
            more_stores: "true"
          });
          
          let fetchUrl = "";
          if (currentPageToken) {
            fetchParams.append("engine", "google_immersive_product");
            fetchParams.append("page_token", currentPageToken);
            fetchUrl = `https://serpapi.com/search.json?${fetchParams.toString()}`;
          } else if (productId) {
            fetchParams.append("engine", "google_product");
            fetchParams.append("product_id", productId);
            fetchUrl = `https://serpapi.com/search.json?${fetchParams.toString()}`;
          } else {
            break;
          }
          
          let innerRes: Response;
          try {
            innerRes = await this.fetchWithTimeoutAndRetry(fetchUrl, 15000, 1);
          } catch (err) {
            console.error("[SerpApi Immersive] Fetch failed or timed out", err);
            break;
          }
          
          if (!innerRes.ok) break;
          
          const innerData = await innerRes.json();
          if (innerData.sellers_results && innerData.sellers_results.online_sellers) {
              sellers.push(...innerData.sellers_results.online_sellers);
          } else if (innerData.sellers_results && Array.isArray(innerData.sellers_results)) {
              sellers.push(...innerData.sellers_results);
          } else if (innerData.product_results && innerData.product_results.stores) {
              sellers.push(...innerData.product_results.stores);
          }
          
          const paginationToken = innerData.serpapi_pagination?.next_page_token || innerData.search_metadata?.stores_next_page_token || innerData.stores_next_page_token;
          
          if (paginationToken && paginationToken !== currentPageToken) {
              currentPageToken = paginationToken;
          } else {
              break; 
          }
        }
        
        console.log("[9] Seller pages fetched");
        console.log(`[SerpApi] Immersive product requested: YES | Seller pages fetched: ${pageCount} | Sellers received: ${sellers.length}`);
        
        const validResults: RawProductResult[] = [];
        for (const seller of sellers) {
            const sellerPrice = seller.extracted_price ?? seller.extracted_base_price ?? parseFloat(String(seller.base_price || seller.price || "").replace(/[^0-9.]/g, ''));
            if (isNaN(sellerPrice) || sellerPrice <= 0) continue;
            
            const sellerUrl = this.extractDirectMerchantUrl(seller.link, seller.direct_link);

            if (seller.name && seller.name.toLowerCase().includes("flipkart")) {
                console.log("\n[FLIPKART LINK DEBUG]");
                console.log(`seller.name: ${seller.name}`);
                console.log(`seller.direct_link: ${seller.direct_link}`);
                console.log(`seller.link: ${seller.link}`);
                console.log(`resolved productUrl: ${sellerUrl}`);
                console.log("------------------------\n");
            }
            
            // Reconstruct the item title from the query if not present
            validResults.push({
              title: request.normalizedTitle || seller.name || "Unknown Merchant Offer",
              price: sellerPrice,
              currency: "INR",
              image: seller.icon || "",
              url: sellerUrl ?? "",
              source: seller.name || "Unknown Marketplace",
              marketplace: seller.name || "Unknown Marketplace",
              marketplaceLogo: seller.icon,
              availability: seller.status || seller.condition,
              deliveryInfo: seller.delivery || undefined,
            });
        }
        return validResults;
    }

    // PHASE 1: Fetch generic shopping results without immersive queries
    const query = this.buildQuery(request);
    if (!query || query.trim() === "") {
      throw new Error("Unable to build a valid search query from the provided request.");
    }

    console.log("[6] SerpApi request started");
    console.log(`[SerpApi] Executing search for query: "${query}"`);

    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      gl: "in",
      hl: "en",
      api_key: apiKey
    });

    const url = `https://serpapi.com/search.json?${params.toString()}`;

    const response = await this.fetchWithTimeoutAndRetry(url, 15000, 1);

    if (!response.ok) {
      throw new Error(`SerpApi HTTP Error: ${response.status} ${response.statusText}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Received malformed JSON from SerpApi");
    }

    if (data.error) {
      throw new Error(`SerpApi explicitly returned an error: ${data.error}`);
    }

    console.log("[7] Google Shopping response received");

    const shoppingResults = data.shopping_results;
    if (!shoppingResults || !Array.isArray(shoppingResults)) {
      console.warn(`[SerpApi] 'shopping_results' array missing or empty. Query: "${query}"`);
      return [];
    }

    console.log(`[SerpApi] Received ${shoppingResults.length} initial shopping results.`);

    const validResults: RawProductResult[] = [];

    for (const item of shoppingResults) {
      try {
        if (!item.title || !item.source) {
          continue;
        }

        const price = item.extracted_price ?? parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
        if (isNaN(price) || price <= 0) continue;

        const googleLink = item.product_link || item.link;
        const realUrl = this.extractDirectMerchantUrl(item.link, item.direct_link);

        validResults.push({
          title: item.title,
          price: price,
          currency: item.currency || "INR",
          image: item.thumbnail || "",
          url: realUrl ?? "",
          source: item.source || "Unknown Source",
          googleShoppingProductLink: googleLink,
          googleProductId: item.product_id,
          googleImmersiveToken: item.immersive_product_page_token,
          marketplace: item.source,
          marketplaceLogo: item.source_icon,
          rating: item.rating ? Number(item.rating) : undefined,
          deliveryInfo: item.delivery || undefined,
        });
      } catch (err) {
        console.warn("[SerpApi] Discarded a malformed individual result.");
      }
    }

    return validResults;
  }
}
