import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { productVariants } from "./products";
import { offers } from "./offers";

export const recommendationSessions = pgTable(
  "recommendation_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionToken: varchar("session_token", { length: 100 }),
    queryText: text("query_text"),
    anchorVariantId: uuid("anchor_variant_id").references(
      () => productVariants.id,
      { onDelete: "set null" }
    ),
    cheapestOfferId: uuid("cheapest_offer_id").references(() => offers.id, {
      onDelete: "set null",
    }),
    bestValueOfferId: uuid("best_value_offer_id").references(() => offers.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 50 }).notNull().default("recommended"),
    confidence: integer("confidence").notNull().default(100),
    decisionReasons: jsonb("decision_reasons"),
    tradeOffs: jsonb("trade_offs"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_recommendation_sessions_created").on(table.createdAt),
    index("idx_recommendation_sessions_token").on(table.sessionToken),
  ]
);

export const recommendationOffers = pgTable(
  "recommendation_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => recommendationSessions.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    offerRole: varchar("offer_role", { length: 50 }).notNull(),
    rankingTier: integer("ranking_tier"),
    finalScore: numeric("final_score", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_recommendation_offers_session_offer").on(
      table.sessionId,
      table.offerId
    ),
  ]
);

export type RecommendationSession = typeof recommendationSessions.$inferSelect;
export type NewRecommendationSession = typeof recommendationSessions.$inferInsert;

export type RecommendationOffer = typeof recommendationOffers.$inferSelect;
export type NewRecommendationOffer = typeof recommendationOffers.$inferInsert;
