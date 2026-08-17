import type { ProductIdentity } from "../../intelligence/resolver";
import type { ProductIntelligence } from "../../intelligence/types";
import type { CanonicalProduct, ProductOffer } from "./clusterTypes";
import { createCandidateId } from "./candidateId";
import type { RawProductResult } from "./types";

/**
 * Converts a ProductIntelligence candidate into a ProductOffer.
 */
function intelligenceToProductOffer(
  product: ProductIntelligence,
  index: number
): ProductOffer {
  const source = product.metadata.marketplace || "Unknown Source";
  const url = product.originalUrl || "";

  // Construct a stable candidate ID using the standard candidateId helper
  const candidateId = createCandidateId({
    source,
    url,
  } as RawProductResult);

  // Fallback to indexed ID if hash is empty/generic
  const id = candidateId || `offer_${index}_${product.fingerprint}`;

  const confidenceScore = typeof product.confidence === "number" ? product.confidence : 100;
  const confidenceCategory =
    confidenceScore >= 95
      ? "EXACT"
      : confidenceScore >= 80
      ? "HIGH_CONFIDENCE"
      : "POSSIBLE";

  return {
    id,

    source,
    seller: product.metadata.marketplace || null,

    title: product.originalTitle || product.normalizedTitle || "",

    price: product.originalPrice ?? null,
    currency: product.originalCurrency ?? null,

    url,
    imageUrl: product.originalImage ?? null,

    availability: undefined,

    identity: {
      confidence: confidenceCategory,
      score: Math.min(1, Math.max(0, confidenceScore / 100)),
    },

    googleProductId: product.metadata.googleProductId ?? null,
    googleImmersiveToken: product.metadata.googleImmersiveToken ?? null,
    googleShoppingProductLink: product.metadata.googleShoppingProductLink ?? null,
    marketplaceLogo: product.metadata.marketplaceLogo ?? null,
  };
}

/**
 * Converts the final ProductIdentity produced by the orchestrator
 * into a CanonicalProduct expected by the ranking pipeline.
 *
 * This is an ADAPTER ONLY. It performs no identity matching, clustering,
 * contradiction checks, or fingerprint generation.
 */
export function identityToCanonicalProduct(
  identity: ProductIdentity
): CanonicalProduct {
  const rep = identity.representative;

  const offers: ProductOffer[] = (identity.products || []).map((product, index) =>
    intelligenceToProductOffer(product, index)
  );

  return {
    id: identity.id,

    title: rep.normalizedTitle || rep.originalTitle || "",

    brand: rep.brand ?? null,
    model: rep.model ?? null,
    variant: rep.variant ?? null,

    category: rep.category ?? null,
    productType: rep.productType ?? null,

    color: rep.color ?? null,
    size: rep.size ?? null,

    storage: rep.storage ?? null,
    ram: rep.ram ?? null,

    fingerprint: rep.fingerprint ?? null,

    googleProductId: rep.metadata.googleProductId ?? null,

    offers,
  };
}
