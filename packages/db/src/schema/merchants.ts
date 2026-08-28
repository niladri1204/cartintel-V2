import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    hostname: varchar("hostname", { length: 100 }).notNull().unique(),
    domain: varchar("domain", { length: 100 }).notNull(),
    logoUrl: text("logo_url"),
    trustScore: integer("trust_score").notNull().default(75),
    isRecognizedPlatform: boolean("is_recognized_platform").notNull().default(false),
    reliabilityTier: varchar("reliability_tier", { length: 50 })
      .notNull()
      .default("identified_merchant"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_merchants_domain").on(table.domain),
    index("idx_merchants_hostname").on(table.hostname),
  ]
);

export type Merchant = typeof merchants.$inferSelect;
export type NewMerchant = typeof merchants.$inferInsert;
