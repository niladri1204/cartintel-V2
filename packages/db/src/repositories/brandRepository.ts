import { eq, and, sql } from "drizzle-orm";
import { brands, type Brand, type NewBrand } from "../schema/brands";
import type { DatabaseOrTx } from "./types";

export interface UpsertBrandInput {
  name: string;
  slug: string;
  domainCategory?: string | null;
  confidence?: number;
  source?: string;
}

export class BrandRepository {
  async findBySlug(db: DatabaseOrTx, slug: string): Promise<Brand | null> {
    const rows = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, slug))
      .limit(1);
    return rows[0] || null;
  }

  async upsertBrand(db: DatabaseOrTx, input: UpsertBrandInput): Promise<Brand> {
    const cleanSlug = input.slug.trim().toLowerCase();
    const cleanName = input.name.trim().toLowerCase();
    const existing = await this.findBySlug(db, cleanSlug);

    if (!existing) {
      const [inserted] = await db
        .insert(brands)
        .values({
          name: cleanName,
          slug: cleanSlug,
          domainCategory: input.domainCategory || null,
          confidence: input.confidence ?? 100,
          source: input.source || "system",
        })
        .returning();
      return inserted;
    }

    // Do not downgrade existing stronger confidence
    const newConfidence = Math.max(existing.confidence, input.confidence ?? 100);
    const [updated] = await db
      .update(brands)
      .set({
        name: cleanName,
        domainCategory: input.domainCategory || existing.domainCategory,
        confidence: newConfidence,
        source: input.source || existing.source,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, existing.id))
      .returning();

    return updated;
  }
}

export const brandRepository = new BrandRepository();
