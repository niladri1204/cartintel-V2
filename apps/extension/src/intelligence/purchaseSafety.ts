/**
 * Universal Purchase Safety & Direct URL Sanitization Engine
 * Phase 4.5.5 — Universal Purchase-Safety Validation
 */

export interface PurchaseUrlValidationResult {
  isValid: boolean;
  sanitizedUrl: string | null;
  hostname: string | null;
  isDirectMerchantUrl: boolean;
  reason?: string;
}

/**
 * Sanitizes and unwraps direct purchase URLs, stripping search proxy wrappers
 * (e.g. Google/Serper redirects like `https://www.google.com/url?q=...`).
 */
export function sanitizePurchaseUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) return null;

  // Reject dummy or fabricated placeholders
  if (
    trimmed === "http://fake.url" ||
    trimmed === "https://fake.url" ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed.startsWith("javascript:")
  ) {
    return null;
  }

  let targetUrl = trimmed;

  // Unwrap Google Search Proxy redirect wrapper (e.g., https://www.google.com/url?q=https://amazon.in/dp/...)
  if (targetUrl.includes("google.com/url?") || targetUrl.includes("google.co.in/url?")) {
    try {
      const parsedUrl = new URL(targetUrl);
      const directTarget = parsedUrl.searchParams.get("q") || parsedUrl.searchParams.get("url");
      if (directTarget) {
        targetUrl = decodeURIComponent(directTarget);
      }
    } catch {
      // Fallback regex search for q= parameter
      const match = targetUrl.match(/[?&](?:q|url)=(https?%3A%2F%2F[^&]+|https?:\/\/[^&]+)/i);
      if (match) {
        targetUrl = decodeURIComponent(match[1]);
      }
    }
  }

  // Unwrap Serper / Search proxy redirect wrapper (e.g., https://serper.dev/redirect?link=...)
  if (targetUrl.includes("redirect?") && (targetUrl.includes("link=") || targetUrl.includes("target="))) {
    try {
      const parsedUrl = new URL(targetUrl);
      const directLink = parsedUrl.searchParams.get("link") || parsedUrl.searchParams.get("target");
      if (directLink) {
        targetUrl = decodeURIComponent(directLink);
      }
    } catch {
      // Keep targetUrl as is if parse fails
    }
  }

  // Validate protocol
  try {
    const finalParsed = new URL(targetUrl);
    if (finalParsed.protocol !== "http:" && finalParsed.protocol !== "https:") {
      return null;
    }
    return finalParsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates purchase URL safety, ensuring merchant domain matches URL hostname
 * without cross-domain leakage or search proxy exposure.
 */
export function validatePurchaseUrlSafety(
  rawUrl: string | null | undefined,
  expectedMerchantDomain?: string | null
): PurchaseUrlValidationResult {
  const sanitized = sanitizePurchaseUrl(rawUrl);

  if (!sanitized) {
    return {
      isValid: false,
      sanitizedUrl: null,
      hostname: null,
      isDirectMerchantUrl: false,
      reason: "Missing, invalid, or fabricated purchase URL"
    };
  }

  try {
    const parsed = new URL(sanitized);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    // Verify search proxy wrapper was completely unwrapped
    if (hostname.includes("google.com") || hostname.includes("google.co.in") || hostname.includes("serper.dev")) {
      return {
        isValid: false,
        sanitizedUrl: sanitized,
        hostname,
        isDirectMerchantUrl: false,
        reason: "Google/Serper redirect wrapper exposed as purchase URL"
      };
    }

    // Verify merchant domain consistency if expected merchant domain is provided
    if (expectedMerchantDomain) {
      const normExp = expectedMerchantDomain.toLowerCase().replace(/^www\./, "").trim();

      const matchesDomain =
        hostname === normExp ||
        hostname.endsWith(`.${normExp}`) ||
        normExp.endsWith(`.${hostname}`);

      if (!matchesDomain) {
        return {
          isValid: false,
          sanitizedUrl: sanitized,
          hostname,
          isDirectMerchantUrl: false,
          reason: `Merchant domain mismatch: expected '${normExp}', found '${hostname}'`
        };
      }
    }

    return {
      isValid: true,
      sanitizedUrl: sanitized,
      hostname,
      isDirectMerchantUrl: true
    };
  } catch {
    return {
      isValid: false,
      sanitizedUrl: null,
      hostname: null,
      isDirectMerchantUrl: false,
      reason: "Malformed purchase URL"
    };
  }
}
