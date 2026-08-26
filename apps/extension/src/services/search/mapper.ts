import { processProduct } from "../../intelligence/engine";
import type { ProductIntelligence } from "../../intelligence/types";
import type { RawProductResult } from "./types";
import type { RawDetectionData } from "../../intelligence/engine";
import { normalizeMarketplaceName } from "../../intelligence/marketplace";
import { classifyCandidateQuality } from "../../intelligence/candidateQuality";

export function normalizeOfferUrl(url: string | null | undefined): string {
  if (!url) return "";

  try {
    const u = new URL(url);

    // Remove tracking/referral parameters.
    const removable = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "tag",
      "ref",
      "ref_",
      "pf_rd_p",
      "pf_rd_r",
      "pd_rd_w",
      "pd_rd_wg",
      "pd_rd_r",
      "pd_rd_i",
    ];

    for (const key of removable) {
      u.searchParams.delete(key);
    }

    u.hash = "";

    return `${u.origin}${u.pathname}${u.search}`.replace(/\/+$/, "");
  } catch {
    return url.trim();
  }
}

export function buildOfferDedupKey(product: ProductIntelligence): string {
  const merchant =
    product.metadata?.marketplace?.trim().toLowerCase() || "unknown";

  const normalizedUrl = normalizeOfferUrl(product.originalUrl);

  const price =
    product.originalPrice == null
      ? "unknown"
      : String(product.originalPrice);

  // If URL is not present, use the originalTitle so distinct listings with the same price are never collapsed
  const identifier = normalizedUrl || (product.originalTitle || "").trim().toLowerCase();

  return [
    product.fingerprint || product.normalizedTitle || "unknown-product",
    merchant,
    price,
    identifier,
  ].join("|");
}

export function processSearchResults(
  results: RawProductResult[],
  dedupeContext?: Set<string>
): ProductIntelligence[] {
  const processed: ProductIntelligence[] = [];
  let successCount = 0;
  let failureCount = 0;
  let skippedAccessoryCount = 0;
  let skippedReplacementCount = 0;
  let skippedDuplicateCount = 0;

  const seenKeys = dedupeContext || new Set<string>();

  for (const result of results) {
    try {
      let hostname = result.marketplace;
      try {
        if (result.url) {
          hostname = new URL(result.url).hostname;
        }
      } catch (err) {
        // Fallback to provider's marketplace string if URL parsing fails
      }

      const rawData: RawDetectionData = {
        title: result.title,
        price: result.price ?? null,
        currency: result.currency ?? null,
        image: result.image ?? null,
        url: result.url,
        hostname: hostname
      };

      const intelligence = processProduct(rawData);
      if (!intelligence.metadata) {
        intelligence.metadata = {
          marketplace: "",
          hostname: hostname || "",
          detectedAt: Date.now()
        };
      }
      
      const meta = intelligence.metadata!;
      
      // Override metadata.marketplace with derived canonical merchant name
      meta.marketplace = normalizeMarketplaceName(
        result.marketplace,
        result.url,
        hostname
      );
      meta.marketplaceLogo = result.marketplaceLogo;
      meta.googleShoppingProductLink = result.googleShoppingProductLink;
      meta.googleProductId = result.googleProductId;
      meta.googleImmersiveToken = result.googleImmersiveToken;

      // 1. Candidate Quality Check
      const quality = classifyCandidateQuality(intelligence);
      if (!quality.isEligibleProduct) {
        console.log(`CartIntel SearchMapper: Excluded ineligible candidate "${intelligence.originalTitle}" (Status: ${quality.status}, Reasons: ${quality.reasons.join(", ")})`);
        if (quality.status === "replacement_part") {
          skippedReplacementCount++;
        } else {
          skippedAccessoryCount++;
        }
        continue;
      }

      // 2. Duplicate Safety Check with URL-Preserving Merge
      const duplicateKey = buildOfferDedupKey(intelligence);

      if (seenKeys.has(duplicateKey)) {
        // If an existing processed offer had no URL, but the incoming duplicate does, preserve the valid URL
        const existing = processed.find(p => buildOfferDedupKey(p) === duplicateKey);
        if (existing && !existing.originalUrl && intelligence.originalUrl) {
          existing.originalUrl = intelligence.originalUrl;
        }
        console.log(`CartIntel SearchMapper: Excluded duplicate offer "${intelligence.originalTitle}" (Key: ${duplicateKey})`);
        skippedDuplicateCount++;
        continue;
      }
      seenKeys.add(duplicateKey);

      console.log(`\n[OFFER URL DEBUG]
merchant: ${meta.marketplace}
productUrl: ${intelligence.originalUrl}
------------------------\n`);

      processed.push(intelligence);
      successCount++;
    } catch (error) {
      failureCount++;
      console.warn(`CartIntel SearchMapper: Failed to process external result "${result.title}"`, error);
    }
  }

  // Boundary C URL Trace
  for (const product of processed) {
    if (product.originalUrl) {
      let host = "none";
      try {
        host = new URL(product.originalUrl).hostname;
      } catch {}
      console.log(
        `[URLTrace:Mapped] merchant=${product.metadata?.marketplace} hasOriginalUrl=${Boolean(product.originalUrl)} host=${host}`
      );
    }
  }

  console.log(`[OfferFunnelReject] accessories=${skippedAccessoryCount}`);
  console.log(`[OfferFunnelReject] replacementParts=${skippedReplacementCount}`);
  console.log(`[OfferFunnelReject] duplicate=${skippedDuplicateCount}`);
  console.log(`[OfferFunnel] qualityEligible=${successCount}`);

  console.log(`CartIntel SearchMapper Diagnostics:
  - Raw results received: ${results.length}
  - Successfully processed: ${successCount}
  - Ineligible accessories/parts excluded: ${skippedAccessoryCount + skippedReplacementCount}
  - Duplicate offers excluded: ${skippedDuplicateCount}
  - Failed to process: ${failureCount}
  - Fingerprints generated: ${processed.map(p => p.fingerprint).join(', ')}`);

  return processed;
}
