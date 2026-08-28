import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { brands } from "./brands";

export const canonicalProducts = pgTable(
  "canonical_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id").references(() => brands.id, {
      onDelete: "restrict",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    normalizedModel: varchar("normalized_model", { length: 150 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    subcategory: varchar("subcategory", { length: 100 }),
    productType: varchar("product_type", { length: 100 }),
    commonSpecs: jsonb("common_specs"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_canonical_products_brand_model_type").on(
      table.brandId,
      table.normalizedModel,
      table.productType
    ),
    index("idx_canonical_products_category_type").on(
      table.category,
      table.productType
    ),
    index("idx_canonical_products_model").on(table.normalizedModel),
  ]
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => canonicalProducts.id, { onDelete: "cascade" }),
    canonicalFingerprint: varchar("canonical_fingerprint", {
      length: 255,
    })
      .notNull()
      .unique(),
    color: varchar("color", { length: 50 }),
    storage: varchar("storage", { length: 30 }),
    ram: varchar("ram", { length: 30 }),
    size: varchar("size", { length: 30 }),
    volumeValue: numeric("volume_value", { precision: 10, scale: 2 }),
    volumeUnit: varchar("volume_unit", { length: 20 }),
    packCount: integer("pack_count").default(1),
    shade: varchar("shade", { length: 50 }),
    style: varchar("style", { length: 50 }),
    material: varchar("material", { length: 50 }),
    deepSpecifications: jsonb("deep_specifications"),
    identityConfidence: integer("identity_confidence").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_product_variants_fingerprint").on(
      table.canonicalFingerprint
    ),
    index("idx_product_variants_product_id").on(table.productId),
    index("idx_product_variants_specs").using(
      "gin",
      table.deepSpecifications
    ),
  ]
);

export type CanonicalProduct = typeof canonicalProducts.$inferSelect;
export type NewCanonicalProduct = typeof canonicalProducts.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
