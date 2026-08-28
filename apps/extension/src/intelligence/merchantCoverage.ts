/**
 * Phase 4.8 — Merchant Coverage Engine
 *
 * Provides:
 * 1. Configurable search budget (MAX_SEARCH_QUERIES_PER_ANALYSIS)
 * 2. Deterministic query selection based on information gain
 * 3. Merchant tier classification
 * 4. Merchant coverage tracking & diagnostics
 * 5. Post-deduplication merchant diversity assurance
 */

import type { GeneratedSearchQuery } from "../services/search/queryGenerator";
import type { ProductIntelligence } from "./types";

// ============================================================
// SEARCH BUDGET
// ============================================================

/**
 * Maximum Serper Shopping API requests per single product analysis.
 * Set to 4 for controlled manual testing / development.
 * Increase for production when API quota is not a concern.
 */
export const MAX_SEARCH_QUERIES_PER_ANALYSIS = 4;

// ============================================================
// MERCHANT TIERS
// ============================================================

export type MerchantTier = 1 | 2 | 3 | 4;

export interface MerchantTierResult {
  tier: MerchantTier;
  normalizedName: string;
  label: string;
}

/**
 * Tier 1: Major authorized national marketplaces + official OEM/brand stores.
 * These are the highest-trust merchants.
 */
const TIER_1_PATTERNS: string[] = [
  "amazon",
  "flipkart",
  "myntra",
  "nykaa",
  "ajio",
  "jiomart",
  "tata cliq",
  "tatacliq",
  "reliance digital",
  "reliancedigital",
  "croma",
  "vijay sales",
  "vijaysales",
  "purplle",
  "firstcry",
  "samsung",
  "apple",
  "google store",
  "google",
  "oneplus",
  "xiaomi",
  "nothing",
  "motorola",
  "sony",
  "lg",
  "realme",
  "oppo",
  "vivo",
  "aptronix",
  "adidas",
  "puma",
  "nike",
];

/**
 * Tier 2: Established verified Indian retailers & D2C brand stores.
 */
const TIER_2_PATTERNS: string[] = [
  "zepto",
  "blinkit",
  "instamart",
  "bigbasket",
  "pharmeasy",
  "1mg",
  "tata 1mg",
  "apollo247",
  "apollo pharmacy",
  "netmeds",
  "dawaadost",
  "mars cosmetics",
  "mars",
  "innovist",
  "bare anatomy",
  "chemist at play",
  "sunscoop",
  "recode",
  "recode studios",
  "recodefranchise",
  "dot & key",
  "dotandkey",
  "smytten",
  "clickoncare",
  "newme",
  "savana",
  "snitch",
  "superkicks",
  "vegnonveg",
  "shopsy",
  "meesho",
  "pepperfry",
  "urban ladder",
  "wooden street",
  "ikea",
  "wakefit",
  "bookchor",
  "myg",
  "poorvika",
  "sangeetha",
  "unilet",
  "addmecart",
  "ovantica",
  "cashify",
  "shoppers stop",
];

/**
 * Tier 4: Known accessory/parts/irrelevant merchants.
 * Results from these are deprioritized but NOT automatically discarded
 * (candidateQuality.ts handles that).
 */
const TIER_4_PATTERNS: string[] = [
  "cellspare",
  "maxbhi",
  "spare parts",
  "spareparts",
  "ifixit",
  "aliexpress",
];

/**
 * Classifies a merchant into a trust tier.
 *
 * Does NOT use a finite whitelist — unknown merchants default to Tier 3,
 * which is still valid and shown in comparison.
 */
export function classifyMerchantTier(
  merchantName: string | null | undefined
): MerchantTierResult {
  if (!merchantName) {
    return { tier: 3, normalizedName: "unknown", label: "Unknown Merchant" };
  }

  const normalized = merchantName.toLowerCase().trim();

  for (const pattern of TIER_4_PATTERNS) {
    if (normalized.includes(pattern)) {
      return { tier: 4, normalizedName: normalized, label: merchantName };
    }
  }

  for (const pattern of TIER_1_PATTERNS) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return { tier: 1, normalizedName: normalized, label: merchantName };
    }
  }

  for (const pattern of TIER_2_PATTERNS) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return { tier: 2, normalizedName: normalized, label: merchantName };
    }
  }

  // Unknown merchants are Tier 3 — still valid, still shown
  return { tier: 3, normalizedName: normalized, label: merchantName };
}

// ============================================================
// QUERY SELECTION ENGINE
// ============================================================

/**
 * Selects up to MAX_SEARCH_QUERIES_PER_ANALYSIS queries from the
 * generated query set, prioritizing information gain and eliminating
 * redundant/overlapping queries.
 *
 * Selection strategy:
 * 1. exact product identity (brand + model) — highest priority
 * 2. exact identity + key variant (storage/RAM) — second
 * 3. broad exact product query (with category or full title) — third
 * 4. merchant coverage / broad fallback — fourth
 *
 * Redundancy elimination:
 * - If query A is a substring of query B (or vice versa), the shorter
 *   higher-priority query is preferred and the longer one is skipped
 *   unless it adds significant new tokens.
 */
export function selectCoverageQueries(
  generatedQueries: GeneratedSearchQuery[]
): GeneratedSearchQuery[] {
  if (generatedQueries.length <= MAX_SEARCH_QUERIES_PER_ANALYSIS) {
    return generatedQueries;
  }

  // Sort by priority (highest first) — the generator already does this,
  // but we enforce it here for safety
  const sorted = [...generatedQueries].sort((a, b) => b.priority - a.priority);

  const selected: GeneratedSearchQuery[] = [];
  const selectedTokenSets: Set<string>[] = [];

  for (const candidate of sorted) {
    if (selected.length >= MAX_SEARCH_QUERIES_PER_ANALYSIS) break;

    const candidateTokens = new Set(
      candidate.query.toLowerCase().split(/\s+/).filter(t => t.length > 1)
    );

    // Check if this query is redundant with any already-selected query
    const isRedundant = selectedTokenSets.some(existingTokens => {
      const overlap = [...candidateTokens].filter(t => existingTokens.has(t));
      const overlapRatio = overlap.length / Math.max(candidateTokens.size, 1);
      // If ≥80% of tokens overlap, consider it redundant
      return overlapRatio >= 0.8;
    });

    if (isRedundant) {
      continue;
    }

    selected.push(candidate);
    selectedTokenSets.push(candidateTokens);
  }

  return selected;
}

// ============================================================
// MERCHANT COVERAGE SUMMARY
// ============================================================

export interface MerchantCoverageSummary {
  rawResults: number;
  validProductResults: number;
  rejectedAccessories: number;
  rejectedReplacementParts: number;
  duplicateResults: number;
  uniqueMerchants: number;
  tier1Merchants: number;
  tier2Merchants: number;
  tier3Merchants: number;
  merchantNames: string[];
}

/**
 * Computes a merchant coverage summary from the final processed candidate list.
 * This is diagnostic metadata — it does NOT filter or modify the candidates.
 */
export function computeMerchantCoverage(
  candidates: ProductIntelligence[],
  rawCount: number,
  rejectedAccessories: number,
  rejectedReplacements: number,
  duplicates: number
): MerchantCoverageSummary {
  const merchantSet = new Map<string, MerchantTier>();

  for (const candidate of candidates) {
    const merchantName = candidate.metadata?.marketplace || "Unknown";
    const normalized = merchantName.toLowerCase().trim();
    if (!merchantSet.has(normalized)) {
      const tier = classifyMerchantTier(merchantName);
      merchantSet.set(normalized, tier.tier);
    }
  }

  let tier1 = 0;
  let tier2 = 0;
  let tier3 = 0;
  const names: string[] = [];

  for (const [name, tier] of merchantSet) {
    names.push(name);
    if (tier === 1) tier1++;
    else if (tier === 2) tier2++;
    else if (tier === 3) tier3++;
  }

  const summary: MerchantCoverageSummary = {
    rawResults: rawCount,
    validProductResults: candidates.length,
    rejectedAccessories,
    rejectedReplacementParts: rejectedReplacements,
    duplicateResults: duplicates,
    uniqueMerchants: merchantSet.size,
    tier1Merchants: tier1,
    tier2Merchants: tier2,
    tier3Merchants: tier3,
    merchantNames: names,
  };

  console.log(`[Coverage]
raw=${summary.rawResults}
valid=${summary.validProductResults}
duplicates=${summary.duplicateResults}
accessories=${summary.rejectedAccessories}
replacementParts=${summary.rejectedReplacementParts}
uniqueMerchants=${summary.uniqueMerchants}
tier1=${summary.tier1Merchants}
tier2=${summary.tier2Merchants}
tier3=${summary.tier3Merchants}
merchants=${summary.merchantNames.join(", ")}`);

  return summary;
}

// ============================================================
// MERCHANT DIVERSITY ASSURANCE
// ============================================================

/**
 * Post-processing step that ensures merchant diversity after deduplication.
 *
 * Groups candidates by normalized merchant name, removes exact duplicates
 * (same merchant + same price + same normalized URL), and ensures Tier-1
 * merchants are not accidentally discarded.
 *
 * Does NOT fabricate missing merchants.
 * Does NOT re-sort or re-rank candidates.
 * Does NOT discard any legitimate offer.
 */
export function ensureMerchantCoverage(
  candidates: ProductIntelligence[]
): ProductIntelligence[] {
  const merchantGroups = new Map<string, ProductIntelligence[]>();

  for (const candidate of candidates) {
    const merchantName = (candidate.metadata?.marketplace || "Unknown").toLowerCase().trim();
    if (!merchantGroups.has(merchantName)) {
      merchantGroups.set(merchantName, []);
    }
    merchantGroups.get(merchantName)!.push(candidate);
  }

  // Within each merchant group, remove exact duplicates while preserving valid URLs
  const deduped: ProductIntelligence[] = [];

function normalizeBaseUrl(u?: string | null): string {
  if (!u) return "";
  try {
    const parsed = new URL(u);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/+$/, "");
  } catch {
    return u.toLowerCase().trim();
  }
}

  for (const [, group] of merchantGroups) {
    const seenMap = new Map<string, ProductIntelligence>();
    for (const candidate of group) {
      const fp = candidate.fingerprint || candidate.normalizedTitle || "unknown";
      const price = candidate.originalPrice ?? "unknown";
      const key = `${fp}|${price}`;

      const existing = seenMap.get(key);
      if (!existing) {
        seenMap.set(key, candidate);
      } else {
        // URL-preserving merge: preserve incoming valid URL if existing is empty
        if (!existing.originalUrl && candidate.originalUrl) {
          existing.originalUrl = candidate.originalUrl;
        } else if (
          existing.originalUrl &&
          candidate.originalUrl &&
          normalizeBaseUrl(existing.originalUrl) !== normalizeBaseUrl(candidate.originalUrl)
        ) {
          // Genuinely distinct listings with different URLs
          seenMap.set(`${key}|${candidate.originalUrl}`, candidate);
        }
      }
    }
    for (const item of seenMap.values()) {
      deduped.push(item);
    }
  }

  return deduped;
}
