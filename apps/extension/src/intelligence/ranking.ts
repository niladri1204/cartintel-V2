import type { ProductIntelligence } from "./types";
import type { ProductIdentity } from "./resolver";
import { compareProducts } from "./matching";
import type { MatchResult } from "./matching";
import { normalizeMarketplaceName } from "./marketplace";

export type VariantMatchState = "explicitly_matching" | "missing_unknown" | "explicitly_conflicting";

export type IdentityMatchState =
  | "exact_identity"
  | "high_confidence"
  | "partial_identity"
  | "explicit_contradiction";

export type MarketplaceReliabilityState =
  | "recognized_marketplace"
  | "identified_merchant"
  | "missing_marketplace"
  | "unusable_marketplace";

export type PriceQualityState =
  | "valid_price"
  | "missing_price"
  | "invalid_price";

export type AvailabilityQualityState =
  | "in_stock"
  | "out_of_stock"
  | "unknown_availability"
  | "missing_availability";

export type DuplicateRedundancyState =
  | "same_identity_duplicate"
  | "distinct_identity"
  | "insufficient_identity_data";

export interface CandidateQualityDetails {
  score: number; // 0 - 100 deterministic quality score
  completeness: number; // 0 - 100 field completeness percentage
  factors: {
    hasBrand: boolean;
    hasModel: boolean;
    hasPrice: boolean;
    hasUrl: boolean;
    hasImage: boolean;
    hasMarketplace: boolean;
    hasVariantSpecs: boolean;
  };
}

export interface IdentityConfidenceDetails {
  score: number; // 0 - 100 deterministic identity confidence score
  matchState: IdentityMatchState;
  factors: {
    hasBrandMatch: boolean;
    hasModelMatch: boolean;
    hasCategoryMatch: boolean;
    hasProductTypeMatch: boolean;
    matchedFields: string[];
    mismatchedFields: string[];
    hasExplicitContradiction: boolean;
    isAccessoryOrBundleMismatch: boolean;
    missingVariantFields: string[];
  };
  explanation: string;
}

export interface MarketplaceReliabilityDetails {
  score: number; // 0 - 100 deterministic marketplace reliability score
  reliabilityState: MarketplaceReliabilityState;
  marketplaceName: string; // Canonical marketplace/merchant name derived
  domain: string | null; // Extracted domain/hostname
  factors: {
    isRecognizedPlatform: boolean;
    hasValidDomain: boolean;
    isMarketplaceSpecified: boolean;
    isUnusableSource: boolean;
  };
  explanation: string;
}

export interface PriceAvailabilityQualityDetails {
  score: number; // 0 - 100 deterministic overall score
  priceScore: number; // 0 - 100 price validity score
  availabilityScore: number; // 0 - 100 availability score
  priceState: PriceQualityState;
  availabilityState: AvailabilityQualityState;
  factors: {
    hasValidNumericPrice: boolean;
    hasValidCurrency: boolean;
    isExplicitlyInStock: boolean;
    isExplicitlyOutOfStock: boolean;
    isAvailabilityUnknown: boolean;
  };
  explanation: string;
}

export interface DuplicateRedundancyDetails {
  score: number; // 0 - 100 deterministic redundancy score (100 = identical product identity)
  duplicateState: DuplicateRedundancyState;
  canonicalFingerprint: string; // Candidate's canonical fingerprint (from candidate.fingerprint)
  factors: {
    isSameFingerprint: boolean;
    isSameIdentityMatch: boolean;
    hasVariantContradiction: boolean;
    hasHardIdentityMismatch: boolean;
    isMultiMerchantDuplicate: boolean; // True if same identity found on different merchant
  };
  matchedIdentityFields: string[];
  distinguishingFields: string[];
  explanation: string;
}

export interface FinalRankingDetails {
  finalScore: number; // 0 - 100 deterministic final ranking score
  rankingTier: "exact_identity_tier" | "compatible_identity_tier" | "partial_identity_tier" | "contradiction_tier";
  contributions: {
    identityContribution: number; // Max 50
    qualityContribution: number; // Max 15
    priceAvailabilityContribution: number; // Max 15
    priceCompetitivenessContribution: number; // Max 10
    marketplaceContribution: number; // Max 10
    duplicatePenalty: number; // Subtracted (0 to 15)
  };
  priceCompetitivenessScore: number; // 0 - 100 relative price competitiveness score
  duplicatePenalty: number;
  explanation: string;
}

export type BestListingSelectionTier =
  | "exact_available"
  | "exact_unknown_availability"
  | "compatible_available"
  | "compatible_unknown_availability"
  | "partial_fallback"
  | "no_actionable_offer";

export interface BestListingSelectionDetails {
  selectedOffer: RankedOffer | null;
  selectionTier: BestListingSelectionTier;
  selectionReason: string;
  isFallbackRequired: boolean;
  consideredOfferCount: number;
}

export interface BestListingValidationResult {
  isValid: boolean;
  validationState: 
    | "valid" 
    | "no_actionable_offer" 
    | "invalid_identity" 
    | "invalid_consistency" 
    | "invalid_price" 
    | "invalid_availability" 
    | "invalid_duplicate" 
    | "invalid_ranking" 
    | "invalid_membership";
  selectedOfferValid: boolean;
  failureReasons: string[];
  warnings: string[];
  validatedOfferFingerprint: string | null;
  validatedRankingScore: number | null;
  validatedSelectionTier: BestListingSelectionTier | null;
  explanation: string;
}

export interface RankedOffer {
  product: ProductIntelligence;
  isCurrentProduct: boolean;
  variantState?: VariantMatchState;
  isRefurbishedOrUsed: boolean;
  isUnavailable: boolean;
  savingsValue?: number | null; // Positive numeric savings, or null if none/negative/mismatch
  savingsPercentage?: number | null; // Positive percentage, or null if none/negative/mismatch
  currencyMismatch: boolean; // True if this offer cannot be directly compared
  rejectionReason?: string;
  qualityScore?: number;
  qualityDetails?: CandidateQualityDetails;
  identityConfidenceScore?: number;
  identityConfidenceDetails?: IdentityConfidenceDetails;
  marketplaceReliabilityScore?: number;
  marketplaceReliabilityDetails?: MarketplaceReliabilityDetails;
  priceAvailabilityScore?: number;
  priceAvailabilityDetails?: PriceAvailabilityQualityDetails;
  duplicateRedundancyScore?: number;
  duplicateRedundancyDetails?: DuplicateRedundancyDetails;
  finalRankingScore?: number;
  rankingDetails?: FinalRankingDetails;
}

export interface RankedDealResult {
  currentProduct: ProductIntelligence;
  offers: RankedOffer[]; // All validated candidate offers for display
  bestOffer: RankedOffer | null; // The single best offer eligible for recommendation
  bestListingDetails?: BestListingSelectionDetails; // Phase 1.10.7 Selection Details
  hasCurrencyMismatch: boolean;
}

/**
 * Calculates a deterministic, explainable Candidate Quality score (0-100)
 * based on candidate product field completeness and offer validity signals.
 */
export function calculateCandidateQuality(candidate: ProductIntelligence): CandidateQualityDetails {
  if (!candidate) {
    return {
      score: 0,
      completeness: 0,
      factors: {
        hasBrand: false,
        hasModel: false,
        hasPrice: false,
        hasUrl: false,
        hasImage: false,
        hasMarketplace: false,
        hasVariantSpecs: false
      }
    };
  }

  const hasBrand = Boolean(candidate.brand && candidate.brand.trim().length > 0);
  const hasModel = Boolean(candidate.model && candidate.model.trim().length > 0);
  const hasPrice = Boolean(candidate.originalPrice !== null && candidate.originalPrice !== undefined && candidate.originalPrice > 0);
  const hasUrl = Boolean(candidate.originalUrl && candidate.originalUrl.trim().length > 0);
  const hasImage = Boolean(candidate.originalImage && candidate.originalImage.trim().length > 0);
  const hasMarketplace = Boolean(
    candidate.metadata?.marketplace &&
    candidate.metadata.marketplace.trim().length > 0 &&
    candidate.metadata.marketplace.toLowerCase() !== "unknown seller/site"
  );
  const hasVariantSpecs = Boolean(
    (candidate.storage && candidate.storage.trim().length > 0) ||
    (candidate.ram && candidate.ram.trim().length > 0) ||
    (candidate.color && candidate.color.trim().length > 0) ||
    (candidate.variant && candidate.variant.trim().length > 0)
  );

  let rawScore = 0;

  // 1. Core Product Identity (Max 35 pts)
  if (hasBrand) rawScore += 15;
  if (hasModel) rawScore += 20;

  // 2. Offer Validity & Merchant Metadata (Max 35 pts)
  if (hasPrice) rawScore += 15;
  if (hasUrl) rawScore += 10;
  if (hasMarketplace) rawScore += 10;

  // 3. Media & Spec Attributes (Max 20 pts)
  if (hasImage) rawScore += 10;
  if (hasVariantSpecs) rawScore += 10;

  // 4. Extraction Confidence Alignment (Max 10 pts)
  const confContribution = Math.round(Math.min(100, Math.max(0, candidate.confidence || 0)) * 0.10);
  rawScore += confContribution;

  const finalScore = Math.min(100, Math.max(0, rawScore));

  const hasCategory = Boolean(
    candidate.category &&
    candidate.category.trim().length > 0 &&
    candidate.category.toLowerCase() !== "uncategorized"
  );

  const presentFields = [
    hasBrand,
    hasModel,
    hasPrice,
    hasUrl,
    hasImage,
    hasMarketplace,
    hasCategory,
    hasVariantSpecs
  ].filter(Boolean).length;

  const completeness = Math.round((presentFields / 8) * 100);

  return {
    score: finalScore,
    completeness,
    factors: {
      hasBrand,
      hasModel,
      hasPrice,
      hasUrl,
      hasImage,
      hasMarketplace,
      hasVariantSpecs
    }
  };
}

/**
 * Calculates a deterministic, explainable Identity Confidence score (0-100)
 * quantifying how confidently a candidate represents the requested product identity.
 * Reuses existing Phase 1.9.x matching evidence from compareProducts().
 */
export function calculateIdentityConfidence(
  currentProduct: ProductIntelligence,
  candidate: ProductIntelligence,
  existingMatchResult?: MatchResult
): IdentityConfidenceDetails {
  if (!currentProduct || !candidate) {
    return {
      score: 0,
      matchState: "explicit_contradiction",
      factors: {
        hasBrandMatch: false,
        hasModelMatch: false,
        hasCategoryMatch: false,
        hasProductTypeMatch: false,
        matchedFields: [],
        mismatchedFields: [],
        hasExplicitContradiction: true,
        isAccessoryOrBundleMismatch: false,
        missingVariantFields: []
      },
      explanation: "Invalid current product or candidate object."
    };
  }

  const matchRes = existingMatchResult || compareProducts(currentProduct, candidate);
  const matchedFields = matchRes.matchedFields || [];
  const mismatchedFields = matchRes.mismatchedFields || [];

  const hasBrandMatch = matchedFields.includes("brand");
  const hasModelMatch = matchedFields.includes("model");
  const hasCategoryMatch = matchedFields.includes("category");
  const hasProductTypeMatch = matchedFields.includes("productType");

  const ACCESSORY_REGEX =
    /\b(?:case|cover|screen\s*protector|tempered\s*glass|protective\s*glass|screen\s*guard|phone\s*cover|mobile\s*cover|back\s*cover|bumper\s*case|charger|charging\s*cable|charging\s*adapter|adapter|cable|replacement\s*battery|battery\s*replacement|replacement\s*screen|replacement\s*display|lens\s*protector|camera\s*protector|keyboard\s*cover|laptop\s*sleeve)\b/i;

  const BUNDLE_REGEX =
    /\b(?:combo|bundle|kit|pack\s+with|with\s+case|with\s+charger|with\s+cover|with\s+screen\s+protector)\b|\+\s*(?:case|charger|cover|screen\s*protector)\b/i;

  const getTitleText = (p: ProductIntelligence) => [p.originalTitle, p.normalizedTitle].filter(Boolean).join(" ");

  const curAcc = ACCESSORY_REGEX.test(getTitleText(currentProduct));
  const candAcc = ACCESSORY_REGEX.test(getTitleText(candidate));
  const curBun = BUNDLE_REGEX.test(getTitleText(currentProduct));
  const candBun = BUNDLE_REGEX.test(getTitleText(candidate));

  const isAccessoryOrBundleMismatch =
    mismatchedFields.includes("accessory") ||
    mismatchedFields.includes("bundle") ||
    curAcc !== candAcc ||
    curBun !== candBun;

  const hardIdentityContradiction =
    mismatchedFields.includes("brand") ||
    mismatchedFields.includes("model") ||
    mismatchedFields.includes("category") ||
    mismatchedFields.includes("productType") ||
    isAccessoryOrBundleMismatch;

  const variantContradiction =
    mismatchedFields.includes("storage") ||
    mismatchedFields.includes("ram") ||
    mismatchedFields.includes("color") ||
    mismatchedFields.includes("variant");

  const missingVariantFields: string[] = [];
  if (currentProduct.storage && (!candidate.storage || candidate.storage.trim().length === 0)) {
    missingVariantFields.push("storage");
  }
  if (currentProduct.ram && (!candidate.ram || candidate.ram.trim().length === 0)) {
    missingVariantFields.push("ram");
  }
  if (currentProduct.color && (!candidate.color || candidate.color.trim().length === 0)) {
    missingVariantFields.push("color");
  }
  if (currentProduct.variant && (!candidate.variant || candidate.variant.trim().length === 0)) {
    missingVariantFields.push("variant");
  }

  // 1. Hard identity contradiction -> Score 0
  if (hardIdentityContradiction) {
    let reason = "Hard identity mismatch";
    if (isAccessoryOrBundleMismatch) {
      reason = "Accessory or bundle contradiction";
    } else if (mismatchedFields.includes("productType") || mismatchedFields.includes("category")) {
      reason = "Product type or category contradiction";
    } else if (mismatchedFields.includes("model")) {
      reason = "Different product model";
    } else if (mismatchedFields.includes("brand")) {
      reason = "Different product brand";
    }

    return {
      score: 0,
      matchState: "explicit_contradiction",
      factors: {
        hasBrandMatch,
        hasModelMatch,
        hasCategoryMatch,
        hasProductTypeMatch,
        matchedFields,
        mismatchedFields,
        hasExplicitContradiction: true,
        isAccessoryOrBundleMismatch,
        missingVariantFields
      },
      explanation: `${reason}: mismatched fields [${mismatchedFields.join(", ")}].`
    };
  }

  // 2. Explicit variant contradiction -> Score 10
  if (variantContradiction) {
    return {
      score: 10,
      matchState: "explicit_contradiction",
      factors: {
        hasBrandMatch,
        hasModelMatch,
        hasCategoryMatch,
        hasProductTypeMatch,
        matchedFields,
        mismatchedFields,
        hasExplicitContradiction: true,
        isAccessoryOrBundleMismatch,
        missingVariantFields
      },
      explanation: `Explicit variant conflict: mismatched fields [${mismatchedFields.join(", ")}].`
    };
  }

  // 3. Score calculation for compatible products (isMatch === true)
  const score = matchRes.score;

  let matchState: IdentityMatchState = "high_confidence";
  let explanation = "High confidence identity match.";

  if (score >= 95 || (hasModelMatch && matchedFields.includes("storage") && matchedFields.includes("ram"))) {
    matchState = "exact_identity";
    explanation = "Exact identity match across model and variant attributes.";
  } else if (score >= 80) {
    matchState = "high_confidence";
    explanation = missingVariantFields.length > 0
      ? `Model identity match with unverified/missing variant fields [${missingVariantFields.join(", ")}].`
      : "High confidence model identity match.";
  } else {
    matchState = "partial_identity";
    explanation = "Partial identity match based on title/brand without explicit model match.";
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    matchState,
    factors: {
      hasBrandMatch,
      hasModelMatch,
      hasCategoryMatch,
      hasProductTypeMatch,
      matchedFields,
      mismatchedFields,
      hasExplicitContradiction: false,
      isAccessoryOrBundleMismatch: false,
      missingVariantFields
    },
    explanation
  };
}

const RECOGNIZED_PLATFORMS = new Set([
  "amazon",
  "flipkart",
  "croma",
  "reliance digital",
  "vijay sales",
  "myntra",
  "aptronix",
  "sangeetha mobiles",
  "poorvika",
  "tata cliq",
  "samsung store",
  "apple store",
  "oneplus store"
]);

/**
 * Calculates a deterministic, explainable Marketplace Reliability score (0-100)
 * based on candidate merchant identification and platform recognition.
 */
export function calculateMarketplaceReliability(candidate: ProductIntelligence): MarketplaceReliabilityDetails {
  if (!candidate) {
    return {
      score: 0,
      reliabilityState: "unusable_marketplace",
      marketplaceName: "Unknown seller/site",
      domain: null,
      factors: {
        isRecognizedPlatform: false,
        hasValidDomain: false,
        isMarketplaceSpecified: false,
        isUnusableSource: true
      },
      explanation: "Invalid or missing candidate product object."
    };
  }

  const rawMarketplace = candidate.metadata?.marketplace;
  const rawUrl = candidate.originalUrl;
  const rawHost = candidate.metadata?.hostname;

  // Use existing normalizeMarketplaceName helper from ./marketplace
  const marketplaceName = normalizeMarketplaceName(rawMarketplace, rawUrl, rawHost);

  let domain: string | null = null;
  const targetUrl = rawUrl || (rawHost ? `https://${rawHost}` : null);
  if (targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      domain = parsed.hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      domain = rawHost || null;
    }
  }

  const lowerName = marketplaceName.toLowerCase();
  const isUnusableSource = lowerName === "unknown seller/site" || lowerName === "google" || lowerName === "google shopping";
  const isRecognizedPlatform = !isUnusableSource && RECOGNIZED_PLATFORMS.has(lowerName);

  const isMarketplaceSpecified = Boolean(
    rawMarketplace &&
    rawMarketplace.trim().length > 0 &&
    rawMarketplace.toLowerCase() !== "unknown seller/site" &&
    rawMarketplace.toLowerCase() !== "google"
  );

  const hasValidDomain = Boolean(domain && domain.trim().length > 0 && !domain.includes("google."));

  // 1. Unusable / Unidentifiable Marketplace -> Score 0
  if (isUnusableSource && !hasValidDomain) {
    return {
      score: 0,
      reliabilityState: "unusable_marketplace",
      marketplaceName,
      domain,
      factors: {
        isRecognizedPlatform: false,
        hasValidDomain: false,
        isMarketplaceSpecified: false,
        isUnusableSource: true
      },
      explanation: "Unusable or unidentifiable marketplace/merchant information."
    };
  }

  // 2. Recognized Major Platform -> Score 100
  if (isRecognizedPlatform) {
    return {
      score: 100,
      reliabilityState: "recognized_marketplace",
      marketplaceName,
      domain,
      factors: {
        isRecognizedPlatform: true,
        hasValidDomain,
        isMarketplaceSpecified,
        isUnusableSource: false
      },
      explanation: `Recognized major e-commerce platform: ${marketplaceName}`
    };
  }

  // 3. Identified Merchant (Valid custom domain/merchant) -> Score 75
  if (hasValidDomain || isMarketplaceSpecified) {
    return {
      score: 75,
      reliabilityState: "identified_merchant",
      marketplaceName,
      domain,
      factors: {
        isRecognizedPlatform: false,
        hasValidDomain,
        isMarketplaceSpecified,
        isUnusableSource: false
      },
      explanation: `Identified merchant domain: ${marketplaceName}`
    };
  }

  // 4. Missing Marketplace Details -> Score 40
  return {
    score: 40,
    reliabilityState: "missing_marketplace",
    marketplaceName,
    domain,
    factors: {
      isRecognizedPlatform: false,
      hasValidDomain: false,
      isMarketplaceSpecified: false,
      isUnusableSource: false
    },
    explanation: "Marketplace identification missing or incomplete."
  };
}

/**
 * Calculates a deterministic, explainable Price & Availability Quality score (0-100)
 * based on price validity and explicit availability signals of the candidate offer.
 * Absolute price amount does NOT alter quality score (valid ₹50,000 and valid ₹45,000 score identically).
 * Does NOT infer "in_stock" merely because price, URL, or marketplace exists.
 */
export function calculatePriceAvailabilityQuality(candidate: ProductIntelligence): PriceAvailabilityQualityDetails {
  if (!candidate) {
    return {
      score: 0,
      priceScore: 0,
      availabilityScore: 0,
      priceState: "missing_price",
      availabilityState: "missing_availability",
      factors: {
        hasValidNumericPrice: false,
        hasValidCurrency: false,
        isExplicitlyInStock: false,
        isExplicitlyOutOfStock: true,
        isAvailabilityUnknown: false
      },
      explanation: "Invalid or missing candidate product object."
    };
  }

  // 1. Price Validity Evaluation
  const rawPrice = candidate.originalPrice;
  const rawCurrency = candidate.originalCurrency;

  const hasValidNumericPrice = typeof rawPrice === "number" && !isNaN(rawPrice) && isFinite(rawPrice) && rawPrice > 0;
  const hasValidCurrency = Boolean(rawCurrency && rawCurrency.trim().length > 0);

  let priceScore = 0;
  let priceState: PriceQualityState = "missing_price";

  if (rawPrice === null || rawPrice === undefined) {
    priceState = "missing_price";
    priceScore = 0;
  } else if (typeof rawPrice !== "number" || isNaN(rawPrice) || !isFinite(rawPrice) || rawPrice <= 0) {
    priceState = "invalid_price";
    priceScore = 0;
  } else if (hasValidNumericPrice) {
    priceState = "valid_price";
    priceScore = 100;
  }

  // 2. Availability Evaluation - Derived strictly from explicit local data
  const isExplicitlyInStock = isExplicitlyInStockProduct(candidate);
  const isExplicitlyOutOfStock = isUnavailableProduct(candidate);

  let availabilityScore = 0;
  let availabilityState: AvailabilityQualityState = "unknown_availability";

  let isAvailabilityUnknown = false;

  if (isExplicitlyOutOfStock) {
    availabilityState = "out_of_stock";
    availabilityScore = 0;
  } else if (isExplicitlyInStock) {
    availabilityState = "in_stock";
    availabilityScore = 100;
  } else {
    // Neither explicit in-stock nor explicit out-of-stock data present -> unknown_availability
    availabilityState = "unknown_availability";
    availabilityScore = 50;
    isAvailabilityUnknown = true;
  }

  const overallScore = Math.round((priceScore * 0.5) + (availabilityScore * 0.5));

  let explanation = "Valid price and availability evaluated.";
  if (priceState === "missing_price" && availabilityState === "out_of_stock") {
    explanation = "Missing price and offer is explicitly out of stock.";
  } else if (priceState === "missing_price" && availabilityState === "in_stock") {
    explanation = "Missing price information, though offer explicitly indicates in-stock.";
  } else if (priceState === "missing_price") {
    explanation = "Missing price information and availability is unknown.";
  } else if (priceState === "invalid_price") {
    explanation = "Invalid or non-positive price value.";
  } else if (availabilityState === "in_stock") {
    explanation = "Valid price and offer explicitly indicates in-stock.";
  } else if (availabilityState === "out_of_stock") {
    explanation = "Valid price, but offer is explicitly out of stock.";
  } else if (availabilityState === "unknown_availability") {
    explanation = "Valid price, but offer availability is unverified/unknown.";
  }

  return {
    score: overallScore,
    priceScore,
    availabilityScore,
    priceState,
    availabilityState,
    factors: {
      hasValidNumericPrice,
      hasValidCurrency,
      isExplicitlyInStock,
      isExplicitlyOutOfStock,
      isAvailabilityUnknown
    },
    explanation
  };
}

/**
 * Calculates a conservative, deterministic Duplicate/Redundancy score (0-100)
 * identifying whether a candidate represents the SAME underlying product identity as currentProduct.
 * Reuses existing canonical fingerprint and compareProducts() match evidence from Phase 1.9.x.
 * Does NOT filter, remove, or delete candidate offers.
 */
export function calculateDuplicateRedundancy(
  currentProduct: ProductIntelligence,
  candidate: ProductIntelligence,
  existingMatchResult?: MatchResult
): DuplicateRedundancyDetails {
  if (!currentProduct || !candidate) {
    return {
      score: 0,
      duplicateState: "insufficient_identity_data",
      canonicalFingerprint: "",
      factors: {
        isSameFingerprint: false,
        isSameIdentityMatch: false,
        hasVariantContradiction: true,
        hasHardIdentityMismatch: true,
        isMultiMerchantDuplicate: false
      },
      matchedIdentityFields: [],
      distinguishingFields: [],
      explanation: "Invalid current product or candidate object."
    };
  }

  const canonicalFingerprint = candidate.fingerprint || "";

  // Check for insufficient identity information
  const hasCandBrand = Boolean(candidate.brand && candidate.brand.trim().length > 0);
  const hasCandModel = Boolean(candidate.model && candidate.model.trim().length > 0);
  const hasCurrBrand = Boolean(currentProduct.brand && currentProduct.brand.trim().length > 0);
  const hasCurrModel = Boolean(currentProduct.model && currentProduct.model.trim().length > 0);

  if ((!hasCandBrand && !hasCandModel) || (!hasCurrBrand && !hasCurrModel)) {
    return {
      score: 30,
      duplicateState: "insufficient_identity_data",
      canonicalFingerprint,
      factors: {
        isSameFingerprint: false,
        isSameIdentityMatch: false,
        hasVariantContradiction: false,
        hasHardIdentityMismatch: false,
        isMultiMerchantDuplicate: false
      },
      matchedIdentityFields: [],
      distinguishingFields: [],
      explanation: "Insufficient brand/model identity data to safely determine duplication."
    };
  }

  const matchRes = existingMatchResult || compareProducts(currentProduct, candidate);
  const matchedFields = matchRes.matchedFields || [];
  const mismatchedFields = matchRes.mismatchedFields || [];

  const isSameFingerprint = Boolean(
    currentProduct.fingerprint &&
    candidate.fingerprint &&
    currentProduct.fingerprint === candidate.fingerprint
  );

  const hardIdentityContradiction =
    mismatchedFields.includes("brand") ||
    mismatchedFields.includes("model") ||
    mismatchedFields.includes("category") ||
    mismatchedFields.includes("productType") ||
    mismatchedFields.includes("accessory") ||
    mismatchedFields.includes("bundle");

  const variantContradiction =
    mismatchedFields.includes("storage") ||
    mismatchedFields.includes("ram") ||
    mismatchedFields.includes("color") ||
    mismatchedFields.includes("variant");

  // 1. Explicit contradiction -> distinct identity (score = 0)
  if (hardIdentityContradiction || variantContradiction || !matchRes.isMatch) {
    let reason = "Different product identity";
    if (mismatchedFields.includes("accessory")) {
      reason = "Accessory vs standalone product contradiction";
    } else if (mismatchedFields.includes("bundle")) {
      reason = "Bundle vs standalone product contradiction";
    } else if (variantContradiction) {
      reason = `Explicit variant conflict (${mismatchedFields.filter(f => ["storage", "ram", "color", "variant"].includes(f)).join(", ")})`;
    } else if (mismatchedFields.includes("model")) {
      reason = "Different product model";
    } else if (mismatchedFields.includes("brand")) {
      reason = "Different product brand";
    }

    return {
      score: 0,
      duplicateState: "distinct_identity",
      canonicalFingerprint,
      factors: {
        isSameFingerprint,
        isSameIdentityMatch: false,
        hasVariantContradiction: variantContradiction,
        hasHardIdentityMismatch: hardIdentityContradiction,
        isMultiMerchantDuplicate: false
      },
      matchedIdentityFields: matchedFields,
      distinguishingFields: mismatchedFields,
      explanation: `${reason}: mismatched fields [${mismatchedFields.join(", ")}].`
    };
  }

  // 2. Identical Product Identity (Same fingerprint OR matchRes.isMatch === true)
  const currMarketplace = currentProduct.metadata?.marketplace?.trim().toLowerCase();
  const candMarketplace = candidate.metadata?.marketplace?.trim().toLowerCase();
  const isMultiMerchantDuplicate = Boolean(
    currMarketplace && candMarketplace && currMarketplace !== candMarketplace
  );

  const redundancyScore = isSameFingerprint ? 100 : Math.min(100, Math.max(80, matchRes.score));

  let explanation = "Identical product identity offer.";
  if (isMultiMerchantDuplicate) {
    explanation = `Identical product identity offer across merchants (${currentProduct.metadata.marketplace} vs ${candidate.metadata.marketplace}).`;
  }

  return {
    score: redundancyScore,
    duplicateState: "same_identity_duplicate",
    canonicalFingerprint,
    factors: {
      isSameFingerprint,
      isSameIdentityMatch: true,
      hasVariantContradiction: false,
      hasHardIdentityMismatch: false,
      isMultiMerchantDuplicate
    },
    matchedIdentityFields: matchedFields,
    distinguishingFields: [],
    explanation
  };
}

/**
 * Calculates a deterministic, explainable Final Ranking Score (0-100)
 * combining Identity Confidence (50%), Candidate Quality (15%), Price & Availability (15%),
 * Relative Price Competitiveness (10%), and Marketplace Reliability (10%), with Duplicate Penalty.
 * Product identity strongly dominates ranking: hard contradictions get 0 identity contribution and 0 price competitiveness contribution.
 */
export function calculateFinalRanking(
  currentProduct: ProductIntelligence,
  candidate: ProductIntelligence,
  qualityDetails: CandidateQualityDetails,
  identityDetails: IdentityConfidenceDetails,
  marketplaceDetails: MarketplaceReliabilityDetails,
  priceAvailDetails: PriceAvailabilityQualityDetails,
  duplicateDetails: DuplicateRedundancyDetails,
  minCompatiblePrice: number | null,
  isDuplicateRepresentative: boolean = true
): FinalRankingDetails {
  if (!currentProduct || !candidate) {
    return {
      finalScore: 0,
      rankingTier: "contradiction_tier",
      contributions: {
        identityContribution: 0,
        qualityContribution: 0,
        priceAvailabilityContribution: 0,
        priceCompetitivenessContribution: 0,
        marketplaceContribution: 0,
        duplicatePenalty: 0
      },
      priceCompetitivenessScore: 0,
      duplicatePenalty: 0,
      explanation: "Invalid current product or candidate object."
    };
  }

  const identityScore = identityDetails.score || 0;
  const isContradiction = identityDetails.matchState === "explicit_contradiction" || identityDetails.factors.hasExplicitContradiction;
  const isExactIdentity = identityDetails.matchState === "exact_identity";
  const isHighConfidence = identityDetails.matchState === "high_confidence";
  const isPartialIdentity = identityDetails.matchState === "partial_identity";

  // 1. Identity Contribution (50% weight, max 50 pts)
  // Hard contradiction gets 0 identity pts.
  const identityContribution = isContradiction
    ? 0
    : Math.round((identityScore / 100) * 50);

  // 2. Candidate Quality Contribution (15% weight, max 15 pts)
  const qualityContribution = Math.round(((qualityDetails.score || 0) / 100) * 15);

  // 3. Price & Availability Quality Contribution (15% weight, max 15 pts)
  const priceAvailabilityContribution = Math.round(((priceAvailDetails.score || 0) / 100) * 15);

  // 4. Marketplace Reliability Contribution (10% weight, max 10 pts)
  const marketplaceContribution = Math.round(((marketplaceDetails.score || 0) / 100) * 10);

  // 5. Relative Price Competitiveness (10% weight, max 10 pts)
  // GATED: Only identity-compatible candidates with valid prices receive price competitiveness contribution!
  let priceCompetitivenessScore = 0;
  let priceCompetitivenessContribution = 0;

  const candPrice = candidate.originalPrice;
  const hasValidPrice = typeof candPrice === "number" && !isNaN(candPrice) && candPrice > 0;

  if (!isContradiction && identityScore >= 80 && hasValidPrice && minCompatiblePrice !== null && minCompatiblePrice > 0) {
    if (candPrice <= minCompatiblePrice) {
      priceCompetitivenessScore = 100;
    } else {
      // Linear falloff as candidate price exceeds minimum compatible price
      const diffRatio = (candPrice - minCompatiblePrice) / minCompatiblePrice;
      priceCompetitivenessScore = Math.max(0, Math.round(100 - (diffRatio * 100)));
    }
    priceCompetitivenessContribution = Math.round((priceCompetitivenessScore / 100) * 10);
  }

  // 6. Duplicate / Redundancy Penalty (Subtracted)
  // Redundant copies of an already present canonical product receive a small penalty (10 pts).
  // The first / representative offer of a canonical identity gets 0 penalty.
  let duplicatePenalty = 0;
  if (!isDuplicateRepresentative && duplicateDetails.duplicateState === "same_identity_duplicate") {
    duplicatePenalty = 10;
  }

  // Raw score sum
  const rawFinalScore =
    identityContribution +
    qualityContribution +
    priceAvailabilityContribution +
    marketplaceContribution +
    priceCompetitivenessContribution -
    duplicatePenalty;

  const finalScore = Math.min(100, Math.max(0, rawFinalScore));

  let rankingTier: FinalRankingDetails["rankingTier"] = "compatible_identity_tier";
  if (isContradiction) {
    rankingTier = "contradiction_tier";
  } else if (isExactIdentity || isHighConfidence) {
    rankingTier = "exact_identity_tier";
  } else if (isPartialIdentity) {
    rankingTier = "partial_identity_tier";
  }

  let explanation = "Compatible product identity offer.";
  if (isContradiction) {
    explanation = "Excluded from top ranking due to explicit product identity or variant contradiction.";
  } else if (isExactIdentity) {
    explanation = "Exact identity match receiving maximum identity ranking weight.";
  } else if (isPartialIdentity) {
    explanation = "Partial identity match ranking below exact model identity.";
  }

  return {
    finalScore,
    rankingTier,
    contributions: {
      identityContribution,
      qualityContribution,
      priceAvailabilityContribution,
      priceCompetitivenessContribution,
      marketplaceContribution,
      duplicatePenalty
    },
    priceCompetitivenessScore,
    duplicatePenalty,
    explanation
  };
}

/**
 * Normalizes currency codes/symbols into standard 3-letter codes.
 * Treats missing/null or ₹/RS as INR when current product is INR.
 */
export function normalizeCurrencyCode(curr: string | null | undefined, fallback = "INR"): string {
  if (!curr) return fallback;
  const upper = curr.trim().toUpperCase();
  if (upper === "INR" || upper === "₹" || upper === "RS" || upper === "RS.") return "INR";
  if (upper === "USD" || upper === "$") return "USD";
  if (upper === "EUR" || upper === "€") return "EUR";
  if (upper === "GBP" || upper === "£") return "GBP";
  return upper;
}

/**
 * Evaluates candidate variant compatibility against current product.
 * Three states: explicitly_matching | missing_unknown | explicitly_conflicting
 */
export function evaluateVariantState(
  current: ProductIntelligence,
  candidate: ProductIntelligence
): VariantMatchState {
  let hasExplicitMatch = false;
  let hasExplicitConflict = false;

  // 1. RAM Check
  if (current.ram && candidate.ram) {
    if (current.ram.trim().toLowerCase() === candidate.ram.trim().toLowerCase()) {
      hasExplicitMatch = true;
    } else {
      hasExplicitConflict = true;
    }
  }

  // 2. Storage Check
  if (current.storage && candidate.storage) {
    if (current.storage.trim().toLowerCase() === candidate.storage.trim().toLowerCase()) {
      hasExplicitMatch = true;
    } else {
      hasExplicitConflict = true;
    }
  }

  if (hasExplicitConflict) {
    return "explicitly_conflicting";
  }

  if (hasExplicitMatch) {
    return "explicitly_matching";
  }

  // If neither specified RAM or Storage, or both have identical empty attributes
  if (!current.ram && !current.storage && !candidate.ram && !candidate.storage) {
    return "explicitly_matching";
  }

  return "missing_unknown";
}

/**
 * Checks if a product title indicates refurbished / pre-owned / used status.
 */
export function isRefurbishedOrUsedProduct(title: string | null | undefined): boolean {
  if (!title) return false;
  return /\b(?:refurbished|pre-owned|renewed|used|unboxed|open\s*box)\b/i.test(title);
}

/**
 * Checks if a product or offer explicitly indicates in-stock / available status.
 */
export function isExplicitlyInStockProduct(product: ProductIntelligence): boolean {
  if (!product) return false;
  const text = [
    product.originalTitle || "",
    product.normalizedTitle || "",
    ...(product.attributes || [])
  ].join(" ").toLowerCase();

  return /\b(?:in\s*stock|currently\s*in\s*stock|available\s*now|ready\s*to\s*ship|in\s*stock\s*online)\b/i.test(text);
}

/**
 * Checks if a product or offer is out of stock / unavailable.
 */
export function isUnavailableProduct(product: ProductIntelligence): boolean {
  if (!product) return false;
  const text = [
    product.originalTitle || "",
    product.normalizedTitle || "",
    ...(product.attributes || [])
  ].join(" ").toLowerCase();

  return /\b(?:out\s*of\s*stock|currently\s*unavailable|sold\s*out|temporarily\s*unavailable|temporarily\s*out\s*of\s*stock)\b/i.test(text);
}

/**
 * Phase 1.10.7 - Best Listing Selection Layer
 * Deterministically selects the single best actionable offer from already-ranked offers[].
 * Does NOT recalculate ranking weights or formula.
 * Prioritizes identity safety, availability actionability, and valid pricing gates.
 */
export function selectBestListing(
  currentProduct: ProductIntelligence,
  offers: RankedOffer[]
): BestListingSelectionDetails {
  if (!offers || offers.length === 0) {
    return {
      selectedOffer: null,
      selectionTier: "no_actionable_offer",
      selectionReason: "No candidate offers available for selection.",
      isFallbackRequired: false,
      consideredOfferCount: 0
    };
  }

  // 1. Gate out candidates with hard identity or variant contradictions
  const eligibleOffers = offers.filter(o => {
    const isContradictionTier = o.rankingDetails?.rankingTier === "contradiction_tier";
    const hasExplicitContradiction = o.identityConfidenceDetails?.factors.hasExplicitContradiction;
    const isMatchFalse = o.identityConfidenceDetails?.matchState === "explicit_contradiction";
    const isVariantConflict = o.variantState === "explicitly_conflicting";
    return !isContradictionTier && !hasExplicitContradiction && !isMatchFalse && !isVariantConflict;
  });

  if (eligibleOffers.length === 0) {
    return {
      selectedOffer: null,
      selectionTier: "no_actionable_offer",
      selectionReason: "No non-contradictory candidate offer exists for this product identity.",
      isFallbackRequired: true,
      consideredOfferCount: offers.length
    };
  }

  // 2. Group eligible offers by identity priority tier
  const exactOffers = eligibleOffers.filter(o => o.rankingDetails?.rankingTier === "exact_identity_tier");
  const compatibleOffers = eligibleOffers.filter(o => o.rankingDetails?.rankingTier === "compatible_identity_tier");
  const partialOffers = eligibleOffers.filter(o => o.rankingDetails?.rankingTier === "partial_identity_tier");

  let candidatePool = exactOffers;
  let poolTier: "exact" | "compatible" | "partial" = "exact";

  if (candidatePool.length === 0) {
    candidatePool = compatibleOffers;
    poolTier = "compatible";
  }
  if (candidatePool.length === 0) {
    candidatePool = partialOffers;
    poolTier = "partial";
  }
  if (candidatePool.length === 0) {
    candidatePool = eligibleOffers;
    poolTier = "compatible";
  }

  // 3. Filter candidatePool by availability (exclude out of stock if available/unknown-avail offers exist)
  const nonOutOfStockPool = candidatePool.filter(o => {
    const isExplicitOutOfStock = o.isUnavailable || o.priceAvailabilityDetails?.availabilityState === "out_of_stock";
    return !isExplicitOutOfStock;
  });

  const availabilityPool = nonOutOfStockPool.length > 0 ? nonOutOfStockPool : candidatePool;

  // 4. Filter availabilityPool by valid positive numeric price
  const validPricePool = availabilityPool.filter(o => {
    const p = o.product.originalPrice;
    return typeof p === "number" && !isNaN(p) && p > 0;
  });

  const pricePool = validPricePool.length > 0 ? validPricePool : availabilityPool;

  // 5. Filter for new vs refurbished if current product is new
  const isCurrentRefurbished = isRefurbishedOrUsedProduct(currentProduct?.originalTitle);
  const newProductPool = isCurrentRefurbished
    ? pricePool
    : pricePool.filter(o => !o.isRefurbishedOrUsed);

  const finalPool = newProductPool.length > 0 ? newProductPool : pricePool;

  // Pick top candidate from finalPool deterministically using existing Phase 1.10.6 ranking scores and tie-breakers
  const sortedFinalPool = [...finalPool].sort((a, b) => {
    const scoreDiff = (b.finalRankingScore || 0) - (a.finalRankingScore || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const idDiff = (b.identityConfidenceScore || 0) - (a.identityConfidenceScore || 0);
    if (idDiff !== 0) return idDiff;

    const paDiff = (b.priceAvailabilityScore || 0) - (a.priceAvailabilityScore || 0);
    if (paDiff !== 0) return paDiff;

    const pA = a.product.originalPrice !== null ? a.product.originalPrice : Infinity;
    const pB = b.product.originalPrice !== null ? b.product.originalPrice : Infinity;
    if (pA !== pB) return pA - pB;

    const fpComp = (a.product.fingerprint || "").localeCompare(b.product.fingerprint || "");
    if (fpComp !== 0) return fpComp;

    return (a.product.originalUrl || "").localeCompare(b.product.originalUrl || "");
  });

  const selectedOffer = sortedFinalPool[0];

  // Determine selection tier & explanation
  let selectionTier: BestListingSelectionTier = "compatible_available";
  let isFallbackRequired = false;

  const isSelectedInStock = isExplicitlyInStockProduct(selectedOffer.product) || selectedOffer.priceAvailabilityDetails?.availabilityState === "in_stock";

  if (poolTier === "exact") {
    if (isSelectedInStock) {
      selectionTier = "exact_available";
    } else {
      selectionTier = "exact_unknown_availability";
    }
  } else if (poolTier === "compatible") {
    if (isSelectedInStock) {
      selectionTier = "compatible_available";
    } else {
      selectionTier = "compatible_unknown_availability";
    }
    isFallbackRequired = true;
  } else {
    selectionTier = "partial_fallback";
    isFallbackRequired = true;
  }

  let selectionReason = "Selected best actionable candidate offer.";
  if (selectionTier === "exact_available") {
    selectionReason = "Exact product identity match with confirmed availability.";
  } else if (selectionTier === "exact_unknown_availability") {
    selectionReason = "Exact product identity match with unverified/unknown availability.";
  } else if (selectionTier === "compatible_available") {
    selectionReason = "Compatible product identity offer with confirmed availability.";
  } else if (selectionTier === "compatible_unknown_availability") {
    selectionReason = "Compatible product identity offer with unverified availability.";
  } else if (selectionTier === "partial_fallback") {
    selectionReason = "Partial product identity offer selected as fallback.";
  }

  return {
    selectedOffer,
    selectionTier,
    selectionReason,
    isFallbackRequired,
    consideredOfferCount: offers.length
  };
}

/**
 * Deal ranking engine.
 */
export function rankDeals(identity: ProductIdentity): RankedDealResult {
  if (!identity || !identity.representative) {
    throw new Error("CartIntel Ranking: Cannot rank deals without a valid product identity.");
  }

  const currentProduct = identity.representative;
  const currentPrice = currentProduct.originalPrice;
  const currentCurrency = normalizeCurrencyCode(currentProduct.originalCurrency, "INR");
  const isCurrentRefurbished = isRefurbishedOrUsedProduct(currentProduct.originalTitle);

  // Extract external candidate offers (exclude current product by reference and URL)
  const rawCandidates = identity.products.filter(p => {
    if (p === currentProduct) return false;
    if (p.originalUrl && currentProduct.originalUrl && p.originalUrl === currentProduct.originalUrl) {
      return false;
    }
    return true;
  });

  // Deduplicate candidates to prevent duplicate Shopsy/Flipkart copies
  const uniqueCandidates = new Map<string, ProductIntelligence>();
  for (const c of rawCandidates) {
    const merchant = c.metadata.marketplace.toLowerCase();
    const priceStr = c.originalPrice !== null ? c.originalPrice.toString() : "null";
    const vs = evaluateVariantState(currentProduct, c);
    const key = `${merchant}-${priceStr}-${vs}`;
    if (!uniqueCandidates.has(key)) {
      uniqueCandidates.set(key, c);
    }
  }
  const candidates = Array.from(uniqueCandidates.values());

  // 1. Find min price among identity-compatible candidates with valid positive prices
  let minCompatiblePrice: number | null = null;
  for (const candidate of candidates) {
    const p = candidate.originalPrice;
    if (typeof p === "number" && !isNaN(p) && p > 0) {
      const matchRes = compareProducts(currentProduct, candidate);
      if (matchRes.isMatch) {
        if (minCompatiblePrice === null || p < minCompatiblePrice) {
          minCompatiblePrice = p;
        }
      }
    }
  }

  const offers: RankedOffer[] = [];
  let hasCurrencyMismatch = false;

  // 1. Group candidates by canonical fingerprint to select primary representative deterministically
  const fingerprintGroups = new Map<string, ProductIntelligence[]>();
  for (const candidate of candidates) {
    const fp = candidate.fingerprint || candidate.normalizedTitle || "unknown-fp";
    if (!fingerprintGroups.has(fp)) {
      fingerprintGroups.set(fp, []);
    }
    fingerprintGroups.get(fp)!.push(candidate);
  }

  // 2. Identify the single deterministic primary representative for each fingerprint group
  const primaryRepresentatives = new Set<ProductIntelligence>();
  for (const group of fingerprintGroups.values()) {
    if (group.length === 1) {
      primaryRepresentatives.add(group[0]);
    } else {
      // Deterministic sort within group to select primary representative independent of input order
      const sortedGroup = [...group].sort((a, b) => {
        const qA = calculateCandidateQuality(a).score;
        const qB = calculateCandidateQuality(b).score;
        if (qB !== qA) return qB - qA;

        const mktA = calculateMarketplaceReliability(a).score;
        const mktB = calculateMarketplaceReliability(b).score;
        if (mktB !== mktA) return mktB - mktA;

        const paA = calculatePriceAvailabilityQuality(a).score;
        const paB = calculatePriceAvailabilityQuality(b).score;
        if (paB !== paA) return paB - paA;

        const priceA = (typeof a.originalPrice === "number" && !isNaN(a.originalPrice) && a.originalPrice > 0) ? a.originalPrice : Infinity;
        const priceB = (typeof b.originalPrice === "number" && !isNaN(b.originalPrice) && b.originalPrice > 0) ? b.originalPrice : Infinity;
        if (priceA !== priceB) return priceA - priceB;

        return (a.originalUrl || "").localeCompare(b.originalUrl || "");
      });

      primaryRepresentatives.add(sortedGroup[0]);
    }
  }

  for (const candidate of candidates) {
    const candidatePrice = candidate.originalPrice;
    const candidateCurrency = normalizeCurrencyCode(candidate.originalCurrency, currentCurrency);

    const currenciesMatch = currentCurrency === candidateCurrency;
    if (!currenciesMatch) {
      hasCurrencyMismatch = true;
    }

    const canComparePrice = currentPrice !== null && candidatePrice !== null && currenciesMatch;

    let savingsValue: number | null = null;
    let savingsPercentage: number | null = null;

    if (canComparePrice) {
      const diff = currentPrice - candidatePrice;
      if (diff > 0) {
        savingsValue = diff;
        savingsPercentage = currentPrice > 0 ? (diff / currentPrice) * 100 : 0;
      }
    }

    const variantState = evaluateVariantState(currentProduct, candidate);
    const isRefurbishedOrUsed = isRefurbishedOrUsedProduct(candidate.originalTitle);
    const isUnavailable = isUnavailableProduct(candidate);
    const qualityDetails = calculateCandidateQuality(candidate);
    const identityConfidenceDetails = calculateIdentityConfidence(currentProduct, candidate);
    const marketplaceReliabilityDetails = calculateMarketplaceReliability(candidate);
    const priceAvailabilityDetails = calculatePriceAvailabilityQuality(candidate);
    const duplicateRedundancyDetails = calculateDuplicateRedundancy(currentProduct, candidate);

    const isDuplicateRepresentative = primaryRepresentatives.has(candidate);

    const rankingDetails = calculateFinalRanking(
      currentProduct,
      candidate,
      qualityDetails,
      identityConfidenceDetails,
      marketplaceReliabilityDetails,
      priceAvailabilityDetails,
      duplicateRedundancyDetails,
      minCompatiblePrice,
      isDuplicateRepresentative
    );

    let rejectionReason: string | undefined = undefined;
    if (isUnavailable) {
      rejectionReason = "Offer is out of stock";
    } else if (isRefurbishedOrUsed && !isCurrentRefurbished) {
      rejectionReason = "Refurbished/used offer excluded for new product";
    } else if (variantState === "explicitly_conflicting") {
      rejectionReason = "Variant mismatch (RAM/Storage differs)";
    } else if (variantState === "missing_unknown") {
      rejectionReason = "Unverified variant details";
    }

    offers.push({
      product: candidate,
      isCurrentProduct: false,
      variantState,
      isRefurbishedOrUsed,
      isUnavailable,
      savingsValue,
      savingsPercentage,
      currencyMismatch: !currenciesMatch,
      rejectionReason,
      qualityScore: qualityDetails.score,
      qualityDetails,
      identityConfidenceScore: identityConfidenceDetails.score,
      identityConfidenceDetails,
      marketplaceReliabilityScore: marketplaceReliabilityDetails.score,
      marketplaceReliabilityDetails,
      priceAvailabilityScore: priceAvailabilityDetails.score,
      priceAvailabilityDetails,
      duplicateRedundancyScore: duplicateRedundancyDetails.score,
      duplicateRedundancyDetails,
      finalRankingScore: rankingDetails.finalScore,
      rankingDetails
    });
  }

  // Deterministic sorting: finalRankingScore descending with stable tie-breakers
  offers.sort((a, b) => {
    const scoreDiff = (b.finalRankingScore || 0) - (a.finalRankingScore || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const idDiff = (b.identityConfidenceScore || 0) - (a.identityConfidenceScore || 0);
    if (idDiff !== 0) return idDiff;

    const paDiff = (b.priceAvailabilityScore || 0) - (a.priceAvailabilityScore || 0);
    if (paDiff !== 0) return paDiff;

    const pA = a.product.originalPrice !== null ? a.product.originalPrice : Infinity;
    const pB = b.product.originalPrice !== null ? b.product.originalPrice : Infinity;
    if (pA !== pB) return pA - pB;

    const fpComp = (a.product.fingerprint || "").localeCompare(b.product.fingerprint || "");
    if (fpComp !== 0) return fpComp;

    return (a.product.originalUrl || "").localeCompare(b.product.originalUrl || "");
  });

  // Phase 1.10.7 Best Listing Selection
  const bestListingDetails = selectBestListing(currentProduct, offers);
  const bestOffer = bestListingDetails.selectedOffer;

  console.log("[11] Lowest price calculated");

  return {
    currentProduct,
    offers,
    bestOffer,
    bestListingDetails,
    hasCurrencyMismatch
  };
}

/**
 * Phase 1.10.8 - Final Validation Layer
 * Deterministically verifies that the Best Listing selected by Phase 1.10.7 is internally consistent,
 * identity-safe, actionable, and actually belongs to the ranked candidate set.
 * Returns a structured validation failure rather than silently mutating candidates.
 */
export function validateBestListing(result: RankedDealResult): BestListingValidationResult {
  const details = result.bestListingDetails;
  
  if (!details) {
    return {
      isValid: false,
      validationState: "invalid_consistency",
      selectedOfferValid: false,
      failureReasons: ["BestListingSelectionDetails is missing."],
      warnings: [],
      validatedOfferFingerprint: null,
      validatedRankingScore: null,
      validatedSelectionTier: null,
      explanation: "Validation failed: selection details missing."
    };
  }

  const { selectedOffer, selectionTier } = details;
  const failureReasons: string[] = [];
  const warnings: string[] = [];
  let validationState: BestListingValidationResult["validationState"] = "valid";

  // RULE 1: Selection Exists
  if (selectionTier === "no_actionable_offer") {
    if (selectedOffer !== null) {
      failureReasons.push("Selection tier is no_actionable_offer but selectedOffer is not null.");
      validationState = "invalid_consistency";
    }
    
    return {
      isValid: false,
      validationState: validationState === "valid" ? "no_actionable_offer" : validationState,
      selectedOfferValid: false,
      failureReasons,
      warnings,
      validatedOfferFingerprint: null,
      validatedRankingScore: null,
      validatedSelectionTier: selectionTier,
      explanation: failureReasons.length > 0 ? "Validation failed: selection inconsistency." : "No safe best listing exists."
    };
  }

  if (!selectedOffer) {
    return {
      isValid: false,
      validationState: "invalid_consistency",
      selectedOfferValid: false,
      failureReasons: ["Selection tier indicates an offer, but selectedOffer is null."],
      warnings,
      validatedOfferFingerprint: null,
      validatedRankingScore: null,
      validatedSelectionTier: selectionTier,
      explanation: "Validation failed: selectedOffer is null."
    };
  }

  // RULE 2: Selected Offer Belongs to Ranked Set
  const isInSet = result.offers.some(o => 
    o === selectedOffer || 
    (o.product.fingerprint && o.product.fingerprint === selectedOffer.product.fingerprint && o.product.originalUrl === selectedOffer.product.originalUrl)
  );
  if (!isInSet) {
    failureReasons.push("Selected offer does not belong to the ranked candidate set.");
    validationState = "invalid_membership";
  }

  const idDetails = selectedOffer.identityConfidenceDetails;
  const rankingDetails = selectedOffer.rankingDetails;
  const paDetails = selectedOffer.priceAvailabilityDetails;
  const dupDetails = selectedOffer.duplicateRedundancyDetails;

  if (!idDetails || !rankingDetails || !paDetails) {
    failureReasons.push("Selected offer is missing required ranking metadata.");
    validationState = "invalid_consistency";
  } else {
    // RULE 3 & 10: Identity Safety & Product Identity Consistency
    if (selectionTier.includes("exact") || selectionTier.includes("compatible")) {
      const factors = idDetails.factors;
      const mm = factors.mismatchedFields;
      if (
        idDetails.matchState === "explicit_contradiction" ||
        factors.hasExplicitContradiction ||
        mm.includes("brand") ||
        mm.includes("model") ||
        mm.includes("category") ||
        mm.includes("productType") ||
        mm.includes("storage") ||
        mm.includes("ram") ||
        mm.includes("color") ||
        mm.includes("variant") ||
        mm.includes("accessory") ||
        mm.includes("bundle")
      ) {
        failureReasons.push("Selected offer has explicit identity or variant contradictions but claims to be exact/compatible.");
        if (validationState === "valid") validationState = "invalid_identity";
      }
    }

    // RULE 4: Identity Tier Consistency
    if (selectionTier.startsWith("exact_") && rankingDetails.rankingTier !== "exact_identity_tier") {
      failureReasons.push(`Selection tier is ${selectionTier} but ranking tier is ${rankingDetails.rankingTier}.`);
      if (validationState === "valid") validationState = "invalid_consistency";
    }
    if (selectionTier.startsWith("compatible_") && rankingDetails.rankingTier !== "compatible_identity_tier" && rankingDetails.rankingTier !== "exact_identity_tier") {
      failureReasons.push(`Selection tier is ${selectionTier} but ranking tier is ${rankingDetails.rankingTier}.`);
      if (validationState === "valid") validationState = "invalid_consistency";
    }
    if (selectionTier === "partial_fallback" && rankingDetails.rankingTier === "contradiction_tier") {
      failureReasons.push("Partial fallback selected a contradictory offer.");
      if (validationState === "valid") validationState = "invalid_consistency";
    }

    // RULE 5: Price Validity
    if (paDetails.priceState === "invalid_price") {
      failureReasons.push("Selected offer has an invalid price (e.g., negative or NaN).");
      if (validationState === "valid") validationState = "invalid_price";
    }

    // RULE 6: Availability Consistency
    if ((selectionTier === "exact_available" || selectionTier === "compatible_available") && paDetails.availabilityState === "out_of_stock") {
      failureReasons.push(`Selection tier is ${selectionTier} but availability is out_of_stock.`);
      if (validationState === "valid") validationState = "invalid_availability";
    }
    if ((selectionTier === "exact_unknown_availability" || selectionTier === "compatible_unknown_availability") && paDetails.availabilityState === "out_of_stock") {
      failureReasons.push(`Selection tier is ${selectionTier} but availability is out_of_stock.`);
      if (validationState === "valid") validationState = "invalid_availability";
    }

    // RULE 7: Duplicate Consistency
    if (dupDetails && dupDetails.duplicateState === "same_identity_duplicate") {
       if (rankingDetails.duplicatePenalty < 0) {
         failureReasons.push("Duplicate penalty is negative.");
         if (validationState === "valid") validationState = "invalid_duplicate";
       }
    }

    // RULE 8: Ranking Consistency
    const finalScore = selectedOffer.finalRankingScore;
    if (typeof finalScore !== "number" || isNaN(finalScore) || finalScore < 0 || finalScore > 100) {
      failureReasons.push("finalRankingScore is invalid or outside 0-100 range.");
      if (validationState === "valid") validationState = "invalid_ranking";
    }
    const { identityContribution, qualityContribution, priceAvailabilityContribution, priceCompetitivenessContribution, marketplaceContribution, duplicatePenalty } = rankingDetails.contributions;
    if (
      identityContribution < 0 || identityContribution > 50 ||
      qualityContribution < 0 || qualityContribution > 15 ||
      priceAvailabilityContribution < 0 || priceAvailabilityContribution > 15 ||
      priceCompetitivenessContribution < 0 || priceCompetitivenessContribution > 10 ||
      marketplaceContribution < 0 || marketplaceContribution > 10 ||
      duplicatePenalty < 0 || duplicatePenalty > 15
    ) {
      failureReasons.push("Ranking contributions are outside their documented ranges.");
      if (validationState === "valid") validationState = "invalid_ranking";
    }
    if (rankingDetails.finalScore < 0 || rankingDetails.finalScore > 100) {
      failureReasons.push("Ranking details finalScore is outside 0-100 range.");
      if (validationState === "valid") validationState = "invalid_ranking";
    }

    // WARNINGS (Rule 12)
    if (paDetails.availabilityState === "unknown_availability") {
      warnings.push("Selected offer has unknown availability.");
    }
    if (paDetails.priceState === "missing_price") {
      warnings.push("Selected offer is missing price information.");
    }
    if (selectedOffer.marketplaceReliabilityDetails && selectedOffer.marketplaceReliabilityDetails.score < 50) {
      warnings.push("Selected offer is from an unknown or unverified merchant.");
    }
    if (!selectedOffer.product.originalImage) {
      warnings.push("Selected offer is missing an image.");
    }
  }

  const isValid = failureReasons.length === 0;

  return {
    isValid,
    validationState,
    selectedOfferValid: isValid,
    failureReasons,
    warnings,
    validatedOfferFingerprint: isValid && selectedOffer ? selectedOffer.product.fingerprint || null : null,
    validatedRankingScore: isValid && selectedOffer ? selectedOffer.finalRankingScore ?? null : null,
    validatedSelectionTier: selectionTier,
    explanation: isValid ? "Validation passed." : `Validation failed: ${failureReasons.join(" ")}`
  };
}
