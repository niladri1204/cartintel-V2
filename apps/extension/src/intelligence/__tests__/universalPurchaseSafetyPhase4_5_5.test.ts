import { describe, test, expect } from "vitest";
import { sanitizePurchaseUrl, validatePurchaseUrlSafety } from "../purchaseSafety";
import { processProduct } from "../engine";
import { compareProducts } from "../matching";
import { ProductDomain } from "../domain";

describe("Phase 4.5.5 — Universal Purchase-Safety Validation (All 7 Domains)", () => {

  // =========================================================================
  // 1. NO FABRICATED OR DUMMY URLS
  // =========================================================================
  test("1. Rejects null, empty, undefined, fake.url, and javascript: links", () => {
    expect(sanitizePurchaseUrl(null)).toBeNull();
    expect(sanitizePurchaseUrl("")).toBeNull();
    expect(sanitizePurchaseUrl("undefined")).toBeNull();
    expect(sanitizePurchaseUrl("http://fake.url")).toBeNull();
    expect(sanitizePurchaseUrl("javascript:alert(1)")).toBeNull();

    const evalRes = validatePurchaseUrlSafety("http://fake.url", "amazon.in");
    expect(evalRes.isValid).toBe(false);
    expect(evalRes.sanitizedUrl).toBeNull();
  });

  // =========================================================================
  // 2. UNWRAP GOOGLE / SERPER SEARCH PROXY REDIRECT WRAPPERS
  // =========================================================================
  test("2. Unwraps Google and Serper search redirect wrappers into clean direct merchant URLs", () => {
    const googleWrapped = "https://www.google.com/url?q=https%3A%2F%2Fwww.amazon.in%2Fdp%2FB0CX234%3Ftag%3Dcartintel-20";
    const sanitized = sanitizePurchaseUrl(googleWrapped);
    expect(sanitized).toBe("https://www.amazon.in/dp/B0CX234?tag=cartintel-20");

    const evalRes = validatePurchaseUrlSafety(googleWrapped, "amazon.in");
    expect(evalRes.isValid).toBe(true);
    expect(evalRes.hostname).toBe("amazon.in");
    expect(evalRes.isDirectMerchantUrl).toBe(true);

    const serperWrapped = "https://serper.dev/redirect?link=https%3A%2F%2Fwww.myntra.com%2Fshoes%2Fpuma%2F12345";
    const sanitizedSerper = sanitizePurchaseUrl(serperWrapped);
    expect(sanitizedSerper).toBe("https://www.myntra.com/shoes/puma/12345");

    const evalSerper = validatePurchaseUrlSafety(serperWrapped, "myntra.com");
    expect(evalSerper.isValid).toBe(true);
    expect(evalSerper.hostname).toBe("myntra.com");
  });

  // =========================================================================
  // 3. NO CROSS-DOMAIN MERCHANT URL MISMATCH
  // =========================================================================
  test("3. Validates domain matching and rejects cross-domain merchant URL mismatch", () => {
    // Amazon valid
    const amazonRes = validatePurchaseUrlSafety("https://www.amazon.in/dp/B0CX234", "amazon.in");
    expect(amazonRes.isValid).toBe(true);

    // Flipkart valid
    const flipkartRes = validatePurchaseUrlSafety("https://www.flipkart.com/p/itm123", "flipkart.com");
    expect(flipkartRes.isValid).toBe(true);

    // Puma valid
    const pumaRes = validatePurchaseUrlSafety("https://in.puma.com/in/en/pd/12345", "puma.com");
    expect(pumaRes.isValid).toBe(true);

    // Nykaa valid
    const nykaaRes = validatePurchaseUrlSafety("https://www.nykaa.com/product/p/123", "nykaa.com");
    expect(nykaaRes.isValid).toBe(true);

    // IKEA valid
    const ikeaRes = validatePurchaseUrlSafety("https://www.ikea.com/in/en/p/sofa-123", "ikea.com");
    expect(ikeaRes.isValid).toBe(true);

    // Bookchor valid
    const bookchorRes = validatePurchaseUrlSafety("https://www.bookchor.com/product/9780735211292", "bookchor.com");
    expect(bookchorRes.isValid).toBe(true);

    // Mismatched Merchant URL Rejection: Puma merchant with Amazon URL
    const mismatch = validatePurchaseUrlSafety("https://www.amazon.in/dp/B0CX234", "puma.com");
    expect(mismatch.isValid).toBe(false);
    expect(mismatch.reason).toContain("Merchant domain mismatch");
  });

  // =========================================================================
  // 4. EXACT ORIGINAL DIRECT URL PRESERVATION ACROSS PIPELINE
  // =========================================================================
  test("4. Ingestion preserves exact original direct URL across all 7 domains", () => {
    const samples = [
      { domain: ProductDomain.Electronics, url: "https://www.amazon.in/dp/B0SAMSUNG24?ref=sr_1_1" },
      { domain: ProductDomain.Fashion, url: "https://www.hm.com/in/en/product/HMTSHIRT123" },
      { domain: ProductDomain.Fashion, url: "https://in.puma.com/in/en/pd/PUMASHOES999" },
      { domain: ProductDomain.Beauty, url: "https://www.nykaa.com/the-ordinary-niacinamide/p/NYKAA123" },
      { domain: ProductDomain.Grocery, url: "https://blinkit.com/prn/tata-tea-gold/prid/112233" },
      { domain: ProductDomain.Furniture, url: "https://www.ikea.com/in/en/p/ikea-3-seater-sofa-445566" },
      { domain: ProductDomain.Books, url: "https://www.bookchor.com/product/9780735211292" },
    ];

    for (const s of samples) {
      const prod = processProduct({
        title: "Test Product",
        price: 1000,
        currency: "INR",
        image: null,
        url: s.url,
        hostname: new URL(s.url).hostname
      });

      expect(prod.originalUrl).toBe(s.url);
      const sanitized = sanitizePurchaseUrl(prod.originalUrl);
      expect(sanitized).toBe(s.url);
    }
  });

  // =========================================================================
  // 5. SEARCH PROXY EXPOSURE REJECTION
  // =========================================================================
  test("5. Rejects raw unparseable search proxy URLs when destination URL is invalid", () => {
    const badProxy = "https://www.google.com/url?q=invalid_target_url";
    const res = validatePurchaseUrlSafety(badProxy, "amazon.in");
    expect(res.isValid).toBe(false);
  });
});
