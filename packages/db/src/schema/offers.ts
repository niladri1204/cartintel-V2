import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { productVariants } from "./products";
import { merchants } from "./merchants";

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "restrict" }),
    originalTitle: text("original_title").notNull(),
    normalizedTitle: text("normalized_title"),
    originalUrl: text("original_url").notNull(),
    imageUrl: text("image_url"),
    currentPrice: numeric("current_price", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    isAvailable: boolean("is_available").notNull().default(true),
    isRefurbished: boolean("is_refurbished").notNull().default(false),
    qualityScore: integer("quality_score"),
    marketplaceReliabilityScore: integer("marketplace_reliability_score"),
    merchantSku: varchar("merchant_sku", { length: 100 }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_offers_merchant_original_url").on(
      table.merchantId,
      table.originalUrl
    ),
    index("idx_offers_variant_price").on(
      table.variantId,
      table.isAvailable,
      table.currentPrice
    ),
    index("idx_offers_merchant_id").on(table.merchantId),
  ]
);

export const offerPriceHistory = pgTable(
  "offer_price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    isAvailable: boolean("is_available").notNull().default(true),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_price_history_offer_recorded").on(
      table.offerId,
      table.recordedAt
    ),
  ]
);

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

export type OfferPriceHistory = typeof offerPriceHistory.$inferSelect;
export type NewOfferPriceHistory = typeof offerPriceHistory.$inferInsert;
