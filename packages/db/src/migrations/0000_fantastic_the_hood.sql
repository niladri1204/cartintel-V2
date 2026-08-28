CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"domain_category" varchar(50),
	"confidence" integer DEFAULT 100 NOT NULL,
	"source" varchar(50) DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"hostname" varchar(100) NOT NULL,
	"domain" varchar(100) NOT NULL,
	"logo_url" text,
	"trust_score" integer DEFAULT 75 NOT NULL,
	"is_recognized_platform" boolean DEFAULT false NOT NULL,
	"reliability_tier" varchar(50) DEFAULT 'identified_merchant' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
CREATE TABLE "canonical_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"name" varchar(255) NOT NULL,
	"normalized_model" varchar(150) NOT NULL,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"product_type" varchar(100),
	"common_specs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"canonical_fingerprint" varchar(255) NOT NULL,
	"color" varchar(50),
	"storage" varchar(30),
	"ram" varchar(30),
	"size" varchar(30),
	"volume_value" numeric(10, 2),
	"volume_unit" varchar(20),
	"pack_count" integer DEFAULT 1,
	"shade" varchar(50),
	"style" varchar(50),
	"material" varchar(50),
	"deep_specifications" jsonb,
	"identity_confidence" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_canonical_fingerprint_unique" UNIQUE("canonical_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "offer_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"original_title" text NOT NULL,
	"normalized_title" text,
	"original_url" text NOT NULL,
	"image_url" text,
	"current_price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_refurbished" boolean DEFAULT false NOT NULL,
	"quality_score" integer,
	"marketplace_reliability_score" integer,
	"merchant_sku" varchar(100),
	"last_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"offer_role" varchar(50) NOT NULL,
	"ranking_tier" integer,
	"final_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(100),
	"query_text" text,
	"anchor_variant_id" uuid,
	"cheapest_offer_id" uuid,
	"best_value_offer_id" uuid,
	"status" varchar(50) DEFAULT 'recommended' NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"decision_reasons" jsonb,
	"trade_offs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canonical_products" ADD CONSTRAINT "canonical_products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_canonical_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."canonical_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_price_history" ADD CONSTRAINT "offer_price_history_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_offers" ADD CONSTRAINT "recommendation_offers_session_id_recommendation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."recommendation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_offers" ADD CONSTRAINT "recommendation_offers_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_sessions" ADD CONSTRAINT "recommendation_sessions_anchor_variant_id_product_variants_id_fk" FOREIGN KEY ("anchor_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_sessions" ADD CONSTRAINT "recommendation_sessions_cheapest_offer_id_offers_id_fk" FOREIGN KEY ("cheapest_offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_sessions" ADD CONSTRAINT "recommendation_sessions_best_value_offer_id_offers_id_fk" FOREIGN KEY ("best_value_offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_brands_name" ON "brands" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_brands_slug" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_merchants_domain" ON "merchants" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_merchants_hostname" ON "merchants" USING btree ("hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_canonical_products_brand_model_type" ON "canonical_products" USING btree ("brand_id","normalized_model","product_type");--> statement-breakpoint
CREATE INDEX "idx_canonical_products_category_type" ON "canonical_products" USING btree ("category","product_type");--> statement-breakpoint
CREATE INDEX "idx_canonical_products_model" ON "canonical_products" USING btree ("normalized_model");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_variants_fingerprint" ON "product_variants" USING btree ("canonical_fingerprint");--> statement-breakpoint
CREATE INDEX "idx_product_variants_product_id" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_specs" ON "product_variants" USING gin ("deep_specifications");--> statement-breakpoint
CREATE INDEX "idx_price_history_offer_recorded" ON "offer_price_history" USING btree ("offer_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_offers_merchant_original_url" ON "offers" USING btree ("merchant_id","original_url");--> statement-breakpoint
CREATE INDEX "idx_offers_variant_price" ON "offers" USING btree ("variant_id","is_available","current_price");--> statement-breakpoint
CREATE INDEX "idx_offers_merchant_id" ON "offers" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_recommendation_offers_session_offer" ON "recommendation_offers" USING btree ("session_id","offer_id");--> statement-breakpoint
CREATE INDEX "idx_recommendation_sessions_created" ON "recommendation_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_recommendation_sessions_token" ON "recommendation_sessions" USING btree ("session_token");