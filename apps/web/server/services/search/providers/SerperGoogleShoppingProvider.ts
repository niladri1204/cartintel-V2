import type { BackendSearchProvider } from "../index";
import type { SearchRequest, RawProductResult } from "../types";

// ─── Provider-infrastructure domains that must NEVER appear as purchase URLs ───
function isProviderHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  // store.google.com / store.google.co.in is the official Google Store merchant, not provider infrastructure
  if (
    h === "store.google.com" ||
    h.endsWith(".store.google.com") ||
    h === "store.google.co.in" ||
    h.endsWith(".store.google.co.in")
  ) {
    return false;
  }

  // Provider / search infrastructure domains
  return (
    h === "google.com" ||
    h.endsWith(".google.com") ||
    h === "google.co.in" ||
    h.endsWith(".google.co.in") ||
    h === "serpapi.com" ||
    h.endsWith(".serpapi.com") ||
    h === "serper.dev" ||
    h.endsWith(".serper.dev") ||
    h === "googleadservices.com" ||
    h.endsWith(".googleadservices.com")
  );
}

/** Safely extracts a string URL from a string or nested object */
function extractUrlString(val: unknown): string | null {
  if (typeof val === "string" && val.trim().length > 0) {
    return val.trim();
  }
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    for (const key of ["url", "link", "productUrl", "directLink", "href"]) {
      if (typeof obj[key] === "string" && (obj[key] as string).trim().length > 0) {
        return (obj[key] as string).trim();
      }
    }
  }
  return null;
}

export interface CandidateUrlEntry {
  field: string;
  url: string;
}

/**
 * Robust URL candidate extractor that inspects ALL plausible URL fields
 * present in the live Serper Shopping result.
 *
 * Priority order:
 * 1. direct merchant product URL
 * 2. product URL
 * 3. link
 * 4. alternate URL
 */
export function extractCandidateMerchantUrls(item: unknown): CandidateUrlEntry[] {
  if (!item || typeof item !== "object") return [];
  const r = item as Record<string, unknown>;

  const candidates: CandidateUrlEntry[] = [];
  const seenUrls = new Set<string>();

  const addCandidate = (field: string, val: unknown) => {
    const url = extractUrlString(val);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      candidates.push({ field, url });
    }
  };

  // 1. Direct merchant product URLs
  addCandidate("productUrl", r["productUrl"]);
  addCandidate("product_url", r["product_url"]);
  addCandidate("directLink", r["directLink"]);
  addCandidate("direct_link", r["direct_link"]);
  addCandidate("merchantUrl", r["merchantUrl"]);
  addCandidate("merchant_url", r["merchant_url"]);
  addCandidate("buyLink", r["buyLink"]);
  addCandidate("buy_link", r["buy_link"]);
  addCandidate("offerUrl", r["offerUrl"]);
  addCandidate("offer_url", r["offer_url"]);
  addCandidate("storeUrl", r["storeUrl"]);
  addCandidate("store_url", r["store_url"]);

  // 2. Product link / source URL / seller URL
  addCandidate("productLink", r["productLink"]);
  addCandidate("product_link", r["product_link"]);
  addCandidate("sourceUrl", r["sourceUrl"]);
  addCandidate("source_url", r["source_url"]);
  addCandidate("sellerUrl", r["sellerUrl"]);
  addCandidate("seller_url", r["seller_url"]);

  // Also check nested objects if present (e.g. merchant, seller, source)
  if (r["merchant"] && typeof r["merchant"] === "object") {
    const m = r["merchant"] as Record<string, unknown>;
    addCandidate("merchant.url", m["url"]);
    addCandidate("merchant.link", m["link"]);
  }
  if (r["seller"] && typeof r["seller"] === "object") {
    const s = r["seller"] as Record<string, unknown>;
    addCandidate("seller.url", s["url"]);
    addCandidate("seller.link", s["link"]);
  }

  // 3. Standard Serper link
  addCandidate("link", r["link"]);

  // 4. Alternate url
  addCandidate("url", r["url"]);

  return candidates;
}

export interface ResolveMerchantDetails {
  url: string | null;
  sourceField: string | null;
  candidateCount: number;
}

/**
 * Resolves a Serper Shopping result to a direct merchant purchase URL with source field details.
 */
export function resolveMerchantPurchaseUrlWithDetails(result: unknown): ResolveMerchantDetails {
  if (!result || typeof result !== "object") {
    return { url: null, sourceField: null, candidateCount: 0 };
  }

  const candidateList = extractCandidateMerchantUrls(result);

  for (const { field, url } of candidateList) {
    const resolved = resolveUrl(url, new Set<string>(), 0);
    if (resolved) {
      return { url: resolved, sourceField: field, candidateCount: candidateList.length };
    }
  }

  return { url: null, sourceField: null, candidateCount: candidateList.length };
}

/**
 * Resolves a Serper Shopping result to a direct merchant/product URL.
 * Returns null when no non-provider merchant URL can be resolved.
 * A Google search/provider URL is NEVER a valid return value.
 */
export function resolveMerchantPurchaseUrl(result: unknown): string | null {
  const { url } = resolveMerchantPurchaseUrlWithDetails(result);
  return url;
}

function resolveUrl(
  urlStr: string,
  visited: Set<string>,
  depth: number
): string | null {
  if (!urlStr || depth > 5) return null;

  // Normalize Flipkart http → https before any other check
  const normalizedInput = safeNormalizeProtocol(urlStr);
  if (!normalizedInput) return null;

  // Loop guard
  if (visited.has(normalizedInput)) return null;
  visited.add(normalizedInput);

  let parsed: URL;
  try {
    parsed = new URL(normalizedInput);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  // If this is a provider / search infrastructure host (e.g. google.com, google.co.in, shopping.google.com),
  // check if it is a redirect carrying a destination parameter.
  if (isProviderHost(host)) {
    // Try redirect params in order: url → q → adurl → uddg → dest → target → redirect → r → u
    const redirectTarget =
      parsed.searchParams.get("url") ||
      parsed.searchParams.get("q") ||
      parsed.searchParams.get("adurl") ||
      parsed.searchParams.get("uddg") ||
      parsed.searchParams.get("dest") ||
      parsed.searchParams.get("target") ||
      parsed.searchParams.get("redirect") ||
      parsed.searchParams.get("r") ||
      parsed.searchParams.get("u");

    if (redirectTarget) {
      return resolveUrl(redirectTarget, visited, depth + 1);
    }
    // Provider infrastructure with no extractable merchant destination — reject
    return null;
  }

  // Normalize Flipkart http → https (guard for any intermediate hop)
  if (host.includes("flipkart.com") && parsed.protocol === "http:") {
    parsed.protocol = "https:";
    return parsed.toString();
  }

  return normalizedInput;
}

/** Safely upgrade flipkart.com http links to https without mutating paths/params. */
function safeNormalizeProtocol(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    if (u.hostname.toLowerCase().includes("flipkart.com") && u.protocol === "http:") {
      u.protocol = "https:";
      return u.toString();
    }
    return urlStr;
  } catch {
    return null;
  }
}

export class SerperGoogleShoppingProvider implements BackendSearchProvider {
  readonly id = "serper-google-shopping";

  /**
   * Safe fetch wrapper with 15-second timeout.
   * Fails fast on 429 rate limits without retrying. Retries once for transient 5xx errors.
   */
  private async fetchWithTimeoutAndRetry(
    url: string,
    options: RequestInit,
    timeoutMs: number = 15000,
    maxRetries: number = 1
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);

        if (response.ok) {
          return response;
        }

        // 429 Rate Limit / Quota Exceeded: Fail fast immediately without retrying
        if (response.status === 429) {
          console.warn("[Serper] Rate limit (429) or quota exceeded. Returning provider error without retrying.");
          return response;
        }

        // 5xx Server Error: Retry once if retries left
        if (attempt < maxRetries && response.status >= 500) {
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
    console.error("[Serper] Network failure or Timeout after retries:", lastError);
    throw new Error("Google Shopping provider temporarily unavailable.");
  }

  async search(request: SearchRequest): Promise<RawProductResult[]> {
    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
      console.warn("SerperGoogleShoppingProvider: SERPER_API_KEY is not configured.");
      throw new Error("Provider configuration error: Missing API Key");
    }

    // Use the final query supplied by SearchRequest exactly as provided.
    // Do NOT reconstruct or rewrite the query inside SerperGoogleShoppingProvider.
    const query =
      request.normalizedTitle ||
      (request as any).searchContext?.query ||
      request.fingerprint.split("|").join(" ");

    if (!query || query.trim() === "") {
      throw new Error("Unable to execute search: empty query provided in SearchRequest.");
    }

    console.log("[Serper] request started");
    console.log(`[Serper] Executing Shopping search for query: "${query}"`);

    const endpoint = "https://google.serper.dev/shopping";
    const payload = {
      q: query,
      gl: "in",
      hl: "en",
    };

    const response = await this.fetchWithTimeoutAndRetry(endpoint, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      throw new Error("Google Shopping provider rate-limit exceeded (429).");
    }

    if (!response.ok) {
      throw new Error(`Google Shopping provider temporarily unavailable (HTTP ${response.status}).`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error("Received malformed JSON from Serper API");
    }

    console.log("[Serper] Shopping response received");

    const shoppingResults = data?.shopping;
    if (!shoppingResults || !Array.isArray(shoppingResults)) {
      console.warn(`[Serper] 'shopping' array missing or empty. Query: "${query}"`);
      return [];
    }

    console.log(`[Serper] Received ${shoppingResults.length} Shopping results.`);

    // MERCHANT COVERAGE REQUIREMENT:
    // Preserve EVERY legitimate item in Serper's shopping[] response.
    // Do not whitelist merchants, keep only the first merchant, or select cheapest merchant during parsing.
    const validResults: RawProductResult[] = [];
    let invalidPriceCount = 0;

    for (let i = 0; i < shoppingResults.length; i++) {
      const item = shoppingResults[i];
      try {
        if (!item.title || !item.source) {
          continue;
        }

        // Part A: Safe structural diagnostics for Serper response items (first item only)
        if (i === 0) {
          const keys = Object.keys(item);
          console.log(`[SerperFields] keys=${keys.join(",")}`);
          console.log(`[SerperFields] linkPresent=${Boolean(item.link)}`);
          console.log(`[SerperFields] productUrlPresent=${Boolean(item.productUrl || (item as any).product_url)}`);
          console.log(`[SerperFields] urlPresent=${Boolean(item.url)}`);
          console.log(`[SerperFields] productLinkPresent=${Boolean((item as any).productLink || (item as any).product_link)}`);
          console.log(`[SerperFields] directLinkPresent=${Boolean((item as any).directLink || (item as any).direct_link)}`);
        }

        const price =
          typeof item.extractedPrice === "number"
            ? item.extractedPrice
            : parseFloat(String(item.price || "").replace(/[^0-9.]/g, ""));

        if (isNaN(price) || price <= 0) {
          invalidPriceCount++;
          continue;
        }

        // Resolve the merchant purchase URL using the robust helper.
        const { url: merchantUrl, sourceField, candidateCount } = resolveMerchantPurchaseUrlWithDetails(item);

        const merchantName = item.source || "unknown";
        console.log(
          `[MerchantURL] merchant=${merchantName} candidates=${candidateCount} resolved=${Boolean(merchantUrl)}`
        );
        if (merchantUrl && sourceField) {
          console.log(`[MerchantURL] merchant=${merchantName} sourceField=${sourceField}`);
        }

        // IMPORTANT: Never use raw provider link directly as url if it is a provider link.
        // If no merchant URL is resolvable, keep the offer (for comparison) but
        // leave url empty so the popup hides the CTA instead of routing to Google.
        validResults.push({
          title: item.title,
          price: price,
          currency: "INR",
          image: item.imageUrl || item.thumbnail || "",
          url: merchantUrl ?? "",
          source: item.source || "Unknown Source",
          // Preserve the raw Google Shopping link only as provider metadata, never as CTA url.
          googleShoppingProductLink: item.link || null,
          googleProductId: item.productId || null,
          marketplace: item.source || "Unknown Source",
          rating: item.rating ? Number(item.rating) : undefined,
          deliveryInfo: item.delivery || undefined,
        });
      } catch (err) {
        console.warn("[Serper] Discarded a malformed individual result.");
      }
    }

    if (invalidPriceCount > 0) {
      console.log(`[OfferFunnelReject] invalidPrice=${invalidPriceCount}`);
    }

    // Step 2: Return raw results directly (URL resolution runs on final eligible offers post-decision)
    return validResults;
  }
}
