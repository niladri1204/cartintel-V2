import {
  db,
  brandRepository,
  merchantRepository,
  productRepository,
  offerRepository,
  recommendationRepository,
} from "@repo/db";
import {
  validatePersistencePayload,
  type ValidatedPersistencePayload,
} from "./validation";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface PersistenceResult {
  success: boolean;
  sessionId?: string;
  anchorVariantId?: string;
  persistedOffersCount?: number;
  error?: string;
}

export class IntelligencePersistenceService {
  /**
   * Persists finalized CartIntel recommendation results into PostgreSQL.
   * Fully atomic inside a Drizzle transaction with fail-safe error handling.
   */
  async persistRecommendationTransaction(
    rawPayload: any
  ): Promise<PersistenceResult> {
    try {
      const payload = validatePersistencePayload(rawPayload);
      if (!payload) {
        return {
          success: false,
          error: "Invalid or empty persistence payload received.",
        };
      }

      const result = await db.transaction(async (tx) => {
        // 1. Upsert Anchor Brand (or null if brandless)
        let anchorBrandId: string | null = null;
        if (payload.anchorProduct.brandName) {
          const brandSlug = slugify(payload.anchorProduct.brandName);
          if (brandSlug.length > 0) {
            const brand = await brandRepository.upsertBrand(tx, {
              name: payload.anchorProduct.brandName,
              slug: brandSlug,
              domainCategory: payload.anchorProduct.brandCategory,
              confidence: payload.anchorProduct.brandConfidence,
              source: "system",
            });
            anchorBrandId = brand.id;
          }
        }

        // 2. Upsert Anchor Canonical Product
        const anchorCanonical = await productRepository.upsertCanonicalProduct(
          tx,
          {
            brandId: anchorBrandId,
            name: payload.anchorProduct.productTitle,
            normalizedModel: payload.anchorProduct.normalizedModel,
            category: payload.anchorProduct.category,
            subcategory: payload.anchorProduct.subcategory,
            productType: payload.anchorProduct.productType,
            commonSpecs: payload.anchorProduct.deepSpecifications,
          }
        );

        // 3. Upsert Anchor Product Variant
        const anchorVariant = await productRepository.upsertProductVariant(tx, {
          productId: anchorCanonical.id,
          canonicalFingerprint: payload.anchorProduct.canonicalFingerprint,
          color: payload.anchorProduct.color,
          storage: payload.anchorProduct.storage,
          ram: payload.anchorProduct.ram,
          size: payload.anchorProduct.size,
          volumeValue: payload.anchorProduct.volumeValue,
          volumeUnit: payload.anchorProduct.volumeUnit,
          packCount: payload.anchorProduct.packCount,
          shade: payload.anchorProduct.shade,
          style: payload.anchorProduct.style,
          material: payload.anchorProduct.material,
          deepSpecifications: payload.anchorProduct.deepSpecifications,
          identityConfidence: payload.anchorProduct.variantConfidence,
        });

        // 4. Persist Candidate Offers & Merchants
        const offerIdMap = new Map<string, string>();
        const offerAssociations: Array<{
          offerId: string;
          offerRole: string;
          rankingTier?: number | null;
          finalScore?: number | null;
        }> = [];

        for (const o of payload.offers) {
          // Upsert Merchant
          const merchant = await merchantRepository.upsertMerchant(tx, {
            name: o.merchantName,
            hostname: o.merchantHostname,
            domain: o.merchantDomain,
            logoUrl: o.logoUrl,
            trustScore: o.merchantTrustScore,
            isRecognizedPlatform: o.isRecognizedPlatform,
            reliabilityTier: o.reliabilityTier,
          });

          // Upsert Candidate Brand (or null if brandless)
          let offerBrandId: string | null = null;
          if (o.brandName) {
            const brandSlug = slugify(o.brandName);
            if (brandSlug.length > 0) {
              const brand = await brandRepository.upsertBrand(tx, {
                name: o.brandName,
                slug: brandSlug,
                domainCategory: o.brandCategory,
                confidence: o.brandConfidence,
                source: "discovery",
              });
              offerBrandId = brand.id;
            }
          }

          // Upsert Candidate Canonical Product
          const offerCanonical = await productRepository.upsertCanonicalProduct(
            tx,
            {
              brandId: offerBrandId,
              name: o.productTitle,
              normalizedModel: o.normalizedModel,
              category: o.category,
              subcategory: o.subcategory,
              productType: o.productType,
              commonSpecs: o.deepSpecifications,
            }
          );

          // Upsert Candidate Variant
          const offerVariant = await productRepository.upsertProductVariant(
            tx,
            {
              productId: offerCanonical.id,
              canonicalFingerprint: o.canonicalFingerprint,
              color: o.color,
              storage: o.storage,
              ram: o.ram,
              size: o.size,
              volumeValue: o.volumeValue,
              volumeUnit: o.volumeUnit,
              packCount: o.packCount,
              shade: o.shade,
              style: o.style,
              material: o.material,
              deepSpecifications: o.deepSpecifications,
              identityConfidence: o.variantConfidence,
            }
          );

          // Upsert Offer (with Price History)
          const offerResult = await offerRepository.upsertOffer(tx, {
            variantId: offerVariant.id,
            merchantId: merchant.id,
            originalTitle: o.originalTitle,
            normalizedTitle: o.normalizedTitle,
            originalUrl: o.originalUrl,
            imageUrl: o.imageUrl,
            currentPrice: o.currentPrice,
            currency: o.currency,
            isAvailable: o.isAvailable,
            isRefurbished: o.isRefurbished,
            qualityScore: o.qualityScore,
            marketplaceReliabilityScore: o.marketplaceReliabilityScore,
            merchantSku: o.merchantSku,
          });

          const matchKey = `${o.merchantHostname}|${o.originalUrl}`;
          offerIdMap.set(matchKey, offerResult.offer.id);

          offerAssociations.push({
            offerId: offerResult.offer.id,
            offerRole: o.offerRole || "eligible",
            rankingTier: o.rankingTier,
            finalScore: o.finalScore,
          });
        }

        // 5. Match Winning Offers
        let cheapestOfferId: string | null = null;
        let bestValueOfferId: string | null = null;

        if (payload.cheapestOfferMatchKey && offerIdMap.has(payload.cheapestOfferMatchKey)) {
          cheapestOfferId = offerIdMap.get(payload.cheapestOfferMatchKey)!;
        }

        if (payload.bestValueOfferMatchKey && offerIdMap.has(payload.bestValueOfferMatchKey)) {
          bestValueOfferId = offerIdMap.get(payload.bestValueOfferMatchKey)!;
        }

        // 6. Create Recommendation Session
        const session = await recommendationRepository.createSession(
          tx,
          {
            sessionToken: payload.sessionToken,
            queryText: payload.queryText,
            anchorVariantId: anchorVariant.id,
            cheapestOfferId,
            bestValueOfferId,
            status: payload.status,
            confidence: payload.confidence,
            decisionReasons: payload.decisionReasons,
            tradeOffs: payload.tradeOffs,
          },
          offerAssociations
        );

        return {
          success: true,
          sessionId: session.id,
          anchorVariantId: anchorVariant.id,
          persistedOffersCount: offerAssociations.length,
        };
      });

      return result;
    } catch (err) {
      console.error("[IntelligencePersistenceService] Safe error during transaction:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const intelligencePersistenceService = new IntelligencePersistenceService();
