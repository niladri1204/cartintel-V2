import { eq, and } from "drizzle-orm";
import { offers, offerPriceHistory, type Offer, type OfferPriceHistory } from "../schema/offers";
import type { DatabaseOrTx } from "./types";

export interface UpsertOfferInput {
  variantId: string;
  merchantId: string;
  originalTitle: string;
  normalizedTitle?: string | null;
  originalUrl: string;
  imageUrl?: string | null;
  currentPrice: number | string;
  currency?: string;
  isAvailable?: boolean;
  isRefurbished?: boolean;
  qualityScore?: number | null;
  marketplaceReliabilityScore?: number | null;
  merchantSku?: string | null;
}

export interface UpsertOfferResult {
  offer: Offer;
  isInserted: boolean;
  isPriceChanged: boolean;
}

export class OfferRepository {
  async findOffer(
    db: DatabaseOrTx,
    merchantId: string,
    originalUrl: string
  ): Promise<Offer | null> {
    const cleanUrl = originalUrl.trim();
    const rows = await db
      .select()
      .from(offers)
      .where(
        and(eq(offers.merchantId, merchantId), eq(offers.originalUrl, cleanUrl))
      )
      .limit(1);
    return rows[0] || null;
  }

  async upsertOffer(
    db: DatabaseOrTx,
    input: UpsertOfferInput
  ): Promise<UpsertOfferResult> {
    const cleanUrl = input.originalUrl.trim();
    const numericPrice = typeof input.currentPrice === "number"
      ? input.currentPrice.toFixed(2)
      : parseFloat(input.currentPrice).toFixed(2);
    const currency = input.currency?.toUpperCase().trim() || "INR";
    const isAvailable = input.isAvailable ?? true;

    const existing = await this.findOffer(db, input.merchantId, cleanUrl);

    if (!existing) {
      // 1. First observation -> Insert offer & initial price history row
      const [inserted] = await db
        .insert(offers)
        .values({
          variantId: input.variantId,
          merchantId: input.merchantId,
          originalTitle: input.originalTitle.trim(),
          normalizedTitle: input.normalizedTitle?.trim() || null,
          originalUrl: cleanUrl,
          imageUrl: input.imageUrl?.trim() || null,
          currentPrice: numericPrice,
          currency,
          isAvailable,
          isRefurbished: input.isRefurbished ?? false,
          qualityScore: input.qualityScore ?? null,
          marketplaceReliabilityScore: input.marketplaceReliabilityScore ?? null,
          merchantSku: input.merchantSku?.trim() || null,
          lastVerifiedAt: new Date(),
        })
        .returning();

      await db.insert(offerPriceHistory).values({
        offerId: inserted.id,
        price: numericPrice,
        currency,
        isAvailable,
        recordedAt: new Date(),
      });

      return {
        offer: inserted,
        isInserted: true,
        isPriceChanged: true,
      };
    }

    // 2. Existing offer -> Compare price and availability
    const existingPriceNum = parseFloat(String(existing.currentPrice));
    const newPriceNum = parseFloat(numericPrice);
    const priceChanged = Math.abs(existingPriceNum - newPriceNum) > 0.001 || existing.isAvailable !== isAvailable;

    const [updated] = await db
      .update(offers)
      .set({
        variantId: input.variantId, // Update variant association if refined
        originalTitle: input.originalTitle.trim(),
        normalizedTitle: input.normalizedTitle?.trim() || existing.normalizedTitle,
        imageUrl: input.imageUrl?.trim() || existing.imageUrl,
        currentPrice: numericPrice,
        currency,
        isAvailable,
        isRefurbished: input.isRefurbished ?? existing.isRefurbished,
        qualityScore: input.qualityScore ?? existing.qualityScore,
        marketplaceReliabilityScore:
          input.marketplaceReliabilityScore ?? existing.marketplaceReliabilityScore,
        merchantSku: input.merchantSku?.trim() || existing.merchantSku,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(offers.id, existing.id))
      .returning();

    // 3. Insert into price history ONLY if price/availability changed
    if (priceChanged) {
      await db.insert(offerPriceHistory).values({
        offerId: existing.id,
        price: numericPrice,
        currency,
        isAvailable,
        recordedAt: new Date(),
      });
    }

    return {
      offer: updated,
      isInserted: false,
      isPriceChanged: priceChanged,
    };
  }

  async getPriceHistory(
    db: DatabaseOrTx,
    offerId: string
  ): Promise<OfferPriceHistory[]> {
    return await db
      .select()
      .from(offerPriceHistory)
      .where(eq(offerPriceHistory.offerId, offerId));
  }
}

export const offerRepository = new OfferRepository();
