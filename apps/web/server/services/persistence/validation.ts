/**
 * Persistence Payload Validation
 * Enforces strict constraints on data persisting into PostgreSQL.
 */

export interface ValidatedOfferInput {
  merchantName: string;
  merchantHostname: string;
  merchantDomain: string;
  logoUrl?: string | null;
  merchantTrustScore?: number;
  isRecognizedPlatform?: boolean;
  reliabilityTier?: string;

  brandName?: string | null;
  brandCategory?: string | null;
  brandConfidence?: number;

  productTitle: string;
  normalizedModel: string;
  category: string;
  subcategory?: string | null;
  productType?: string | null;

  canonicalFingerprint: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  size?: string | null;
  volumeValue?: number | string | null;
  volumeUnit?: string | null;
  packCount?: number | null;
  shade?: string | null;
  style?: string | null;
  material?: string | null;
  deepSpecifications?: any;
  variantConfidence?: number;

  originalTitle: string;
  normalizedTitle?: string | null;
  originalUrl: string;
  imageUrl?: string | null;
  currentPrice: number;
  currency: string;
  isAvailable: boolean;
  isRefurbished?: boolean;
  qualityScore?: number | null;
  marketplaceReliabilityScore?: number | null;
  merchantSku?: string | null;

  offerRole?: string; // "cheapest" | "best_value" | "eligible" | "alternative" | "ineligible"
  rankingTier?: number | null;
  finalScore?: number | null;
}

export interface ValidatedPersistencePayload {
  sessionToken?: string | null;
  queryText?: string | null;
  status: string;
  confidence: number;
  decisionReasons?: any;
  tradeOffs?: any;

  anchorProduct: {
    brandName?: string | null;
    brandCategory?: string | null;
    brandConfidence?: number;
    productTitle: string;
    normalizedModel: string;
    category: string;
    subcategory?: string | null;
    productType?: string | null;
    canonicalFingerprint: string;
    color?: string | null;
    storage?: string | null;
    ram?: string | null;
    size?: string | null;
    volumeValue?: number | string | null;
    volumeUnit?: string | null;
    packCount?: number | null;
    shade?: string | null;
    style?: string | null;
    material?: string | null;
    deepSpecifications?: any;
    variantConfidence?: number;
  };

  offers: ValidatedOfferInput[];
  cheapestOfferMatchKey?: string | null;
  bestValueOfferMatchKey?: string | null;
}

/**
 * Validates whether a URL is a legitimate, direct HTTPS merchant URL.
 * Rejects Google Shopping redirects, ad tracking links, proxy links, or non-HTTPS URLs.
 */
export function isVerifiedMerchantUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    // Reject Google tracking / redirect / proxy URLs
    if (
      host === "google.com" ||
      host.endsWith(".google.com") ||
      host === "googleadservices.com" ||
      host.endsWith(".googleadservices.com") ||
      host === "googlesyndication.com" ||
      host.includes("serpapi") ||
      host.includes("serper.dev")
    ) {
      return false;
    }

    // Must have a valid dot in hostname (e.g. amazon.in, myntra.com)
    if (!host.includes(".") || host.length < 4) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and sanitizes a raw persistence payload.
 */
export function validatePersistencePayload(raw: any): ValidatedPersistencePayload | null {
  if (!raw || typeof raw !== "object") return null;

  const status = typeof raw.status === "string" ? raw.status.trim() : "completed";
  const confidence = typeof raw.confidence === "number"
    ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
    : 80;

  if (!raw.anchorProduct || typeof raw.anchorProduct !== "object") {
    return null;
  }

  const anchor = raw.anchorProduct;
  const anchorTitle = typeof anchor.productTitle === "string" && anchor.productTitle.trim().length > 0
    ? anchor.productTitle.trim()
    : "Unknown Product";

  const anchorCategory = typeof anchor.category === "string" && anchor.category.trim().length > 0
    ? anchor.category.trim()
    : "General";

  const anchorModel = typeof anchor.normalizedModel === "string" && anchor.normalizedModel.trim().length > 0
    ? anchor.normalizedModel.trim()
    : anchor.productType || anchorTitle;

  const anchorFingerprint = typeof anchor.canonicalFingerprint === "string" && anchor.canonicalFingerprint.trim().length > 0
    ? anchor.canonicalFingerprint.trim().toLowerCase()
    : `${anchor.brandName || "generic"}|${anchorModel}`.toLowerCase();

  const validatedAnchor = {
    brandName: typeof anchor.brandName === "string" && anchor.brandName.trim().length > 0
      ? anchor.brandName.trim()
      : null,
    brandCategory: anchor.brandCategory || null,
    brandConfidence: typeof anchor.brandConfidence === "number" ? anchor.brandConfidence : 100,
    productTitle: anchorTitle,
    normalizedModel: anchorModel,
    category: anchorCategory,
    subcategory: anchor.subcategory || null,
    productType: anchor.productType || null,
    canonicalFingerprint: anchorFingerprint,
    color: anchor.color || null,
    storage: anchor.storage || null,
    ram: anchor.ram || null,
    size: anchor.size || null,
    volumeValue: anchor.volumeValue != null ? anchor.volumeValue : null,
    volumeUnit: anchor.volumeUnit || null,
    packCount: typeof anchor.packCount === "number" ? anchor.packCount : 1,
    shade: anchor.shade || null,
    style: anchor.style || null,
    material: anchor.material || null,
    deepSpecifications: anchor.deepSpecifications || null,
    variantConfidence: typeof anchor.variantConfidence === "number" ? anchor.variantConfidence : 100,
  };

  const rawOffers = Array.isArray(raw.offers) ? raw.offers : [];
  const validatedOffers: ValidatedOfferInput[] = [];

  for (const o of rawOffers) {
    if (!o || typeof o !== "object") continue;

    // Strict URL safety check: only verified direct merchant URLs
    if (!isVerifiedMerchantUrl(o.originalUrl)) {
      continue;
    }

    const price = typeof o.currentPrice === "number" ? o.currentPrice : parseFloat(o.currentPrice);
    if (isNaN(price) || price <= 0) {
      continue;
    }

    const hostname = typeof o.merchantHostname === "string" && o.merchantHostname.trim().length > 0
      ? o.merchantHostname.trim().toLowerCase().replace(/^www\./, "")
      : new URL(o.originalUrl).hostname.toLowerCase().replace(/^www\./, "");

    const domain = typeof o.merchantDomain === "string" && o.merchantDomain.trim().length > 0
      ? o.merchantDomain.trim().toLowerCase().replace(/^www\./, "")
      : hostname;

    const merchantName = typeof o.merchantName === "string" && o.merchantName.trim().length > 0
      ? o.merchantName.trim()
      : hostname;

    const currency = typeof o.currency === "string" && o.currency.trim().length === 3
      ? o.currency.trim().toUpperCase()
      : "INR";

    const title = typeof o.originalTitle === "string" && o.originalTitle.trim().length > 0
      ? o.originalTitle.trim()
      : anchorTitle;

    const model = typeof o.normalizedModel === "string" && o.normalizedModel.trim().length > 0
      ? o.normalizedModel.trim()
      : o.productType || title;

    const fingerprint = typeof o.canonicalFingerprint === "string" && o.canonicalFingerprint.trim().length > 0
      ? o.canonicalFingerprint.trim().toLowerCase()
      : `${o.brandName || "generic"}|${model}`.toLowerCase();

    validatedOffers.push({
      merchantName,
      merchantHostname: hostname,
      merchantDomain: domain,
      logoUrl: o.logoUrl || null,
      merchantTrustScore: typeof o.merchantTrustScore === "number" ? o.merchantTrustScore : 75,
      isRecognizedPlatform: Boolean(o.isRecognizedPlatform),
      reliabilityTier: o.reliabilityTier || "identified_merchant",

      brandName: typeof o.brandName === "string" && o.brandName.trim().length > 0
        ? o.brandName.trim()
        : null,
      brandCategory: o.brandCategory || null,
      brandConfidence: typeof o.brandConfidence === "number" ? o.brandConfidence : 100,

      productTitle: title,
      normalizedModel: model,
      category: o.category || anchorCategory,
      subcategory: o.subcategory || null,
      productType: o.productType || null,

      canonicalFingerprint: fingerprint,
      color: o.color || null,
      storage: o.storage || null,
      ram: o.ram || null,
      size: o.size || null,
      volumeValue: o.volumeValue != null ? o.volumeValue : null,
      volumeUnit: o.volumeUnit || null,
      packCount: typeof o.packCount === "number" ? o.packCount : 1,
      shade: o.shade || null,
      style: o.style || null,
      material: o.material || null,
      deepSpecifications: o.deepSpecifications || null,
      variantConfidence: typeof o.variantConfidence === "number" ? o.variantConfidence : 100,

      originalTitle: title,
      normalizedTitle: o.normalizedTitle || null,
      originalUrl: o.originalUrl.trim(),
      imageUrl: o.imageUrl || null,
      currentPrice: price,
      currency,
      isAvailable: o.isAvailable !== false,
      isRefurbished: Boolean(o.isRefurbished),
      qualityScore: typeof o.qualityScore === "number" ? o.qualityScore : null,
      marketplaceReliabilityScore: typeof o.marketplaceReliabilityScore === "number" ? o.marketplaceReliabilityScore : null,
      merchantSku: o.merchantSku || null,

      offerRole: o.offerRole || "eligible",
      rankingTier: typeof o.rankingTier === "number" ? o.rankingTier : null,
      finalScore: typeof o.finalScore === "number" ? o.finalScore : null,
    });
  }

  return {
    sessionToken: raw.sessionToken || null,
    queryText: raw.queryText || null,
    status,
    confidence,
    decisionReasons: raw.decisionReasons || null,
    tradeOffs: raw.tradeOffs || null,
    anchorProduct: validatedAnchor,
    offers: validatedOffers,
    cheapestOfferMatchKey:
      typeof raw.cheapestOfferMatchKey === "string" && raw.cheapestOfferMatchKey.trim().length > 0
        ? raw.cheapestOfferMatchKey.trim()
        : null,
    bestValueOfferMatchKey:
      typeof raw.bestValueOfferMatchKey === "string" && raw.bestValueOfferMatchKey.trim().length > 0
        ? raw.bestValueOfferMatchKey.trim()
        : null,
  };
}
