import { eq, and, isNull } from "drizzle-orm";
import {
  canonicalProducts,
  productVariants,
  type CanonicalProduct,
  type ProductVariant,
} from "../schema/products";
import type { DatabaseOrTx } from "./types";

export interface UpsertCanonicalProductInput {
  brandId: string | null;
  name: string;
  normalizedModel: string;
  category: string;
  subcategory?: string | null;
  productType?: string | null;
  commonSpecs?: any;
}

export interface UpsertProductVariantInput {
  productId: string;
  canonicalFingerprint: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  size?: string | null;
  volumeValue?: number | string | null;
  volumeUnit?: string | null;
  packCount?: number | null;
  shade?: string | null;
  style?: string | null;
  material?: string | null;
  deepSpecifications?: any;
  identityConfidence?: number;
}

export class ProductRepository {
  async findCanonicalProduct(
    db: DatabaseOrTx,
    brandId: string | null,
    normalizedModel: string,
    productType: string | null
  ): Promise<CanonicalProduct | null> {
    const cleanModel = normalizedModel.trim().toLowerCase();
    const cleanType = productType ? productType.trim().toLowerCase() : null;

    const brandCondition = brandId
      ? eq(canonicalProducts.brandId, brandId)
      : isNull(canonicalProducts.brandId);

    const typeCondition = cleanType
      ? eq(canonicalProducts.productType, cleanType)
      : isNull(canonicalProducts.productType);

    const rows = await db
      .select()
      .from(canonicalProducts)
      .where(
        and(
          brandCondition,
          eq(canonicalProducts.normalizedModel, cleanModel),
          typeCondition
        )
      )
      .limit(1);

    return rows[0] || null;
  }

  async upsertCanonicalProduct(
    db: DatabaseOrTx,
    input: UpsertCanonicalProductInput
  ): Promise<CanonicalProduct> {
    const cleanModel = input.normalizedModel.trim().toLowerCase();
    const cleanType = input.productType ? input.productType.trim().toLowerCase() : null;

    const existing = await this.findCanonicalProduct(
      db,
      input.brandId,
      cleanModel,
      cleanType
    );

    if (!existing) {
      const [inserted] = await db
        .insert(canonicalProducts)
        .values({
          brandId: input.brandId || null,
          name: input.name.trim(),
          normalizedModel: cleanModel,
          category: input.category.trim(),
          subcategory: input.subcategory?.trim() || null,
          productType: cleanType,
          commonSpecs: input.commonSpecs || null,
        })
        .returning();
      return inserted;
    }

    const [updated] = await db
      .update(canonicalProducts)
      .set({
        name: input.name.trim(),
        category: input.category.trim(),
        subcategory: input.subcategory?.trim() || existing.subcategory,
        commonSpecs: input.commonSpecs || existing.commonSpecs,
        updatedAt: new Date(),
      })
      .where(eq(canonicalProducts.id, existing.id))
      .returning();

    return updated;
  }

  async findVariantByFingerprint(
    db: DatabaseOrTx,
    fingerprint: string
  ): Promise<ProductVariant | null> {
    const cleanFingerprint = fingerprint.trim().toLowerCase();
    const rows = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.canonicalFingerprint, cleanFingerprint))
      .limit(1);
    return rows[0] || null;
  }

  async upsertProductVariant(
    db: DatabaseOrTx,
    input: UpsertProductVariantInput
  ): Promise<ProductVariant> {
    const cleanFingerprint = input.canonicalFingerprint.trim().toLowerCase();
    const existing = await this.findVariantByFingerprint(db, cleanFingerprint);

    if (!existing) {
      const [inserted] = await db
        .insert(productVariants)
        .values({
          productId: input.productId,
          canonicalFingerprint: cleanFingerprint,
          color: input.color?.trim() || null,
          storage: input.storage?.trim() || null,
          ram: input.ram?.trim() || null,
          size: input.size?.trim() || null,
          volumeValue: input.volumeValue != null ? String(input.volumeValue) : null,
          volumeUnit: input.volumeUnit?.trim() || null,
          packCount: input.packCount ?? 1,
          shade: input.shade?.trim() || null,
          style: input.style?.trim() || null,
          material: input.material?.trim() || null,
          deepSpecifications: input.deepSpecifications || null,
          identityConfidence: input.identityConfidence ?? 100,
        })
        .returning();
      return inserted;
    }

    const newConfidence = Math.max(
      existing.identityConfidence,
      input.identityConfidence ?? 100
    );

    const [updated] = await db
      .update(productVariants)
      .set({
        color: input.color?.trim() || existing.color,
        storage: input.storage?.trim() || existing.storage,
        ram: input.ram?.trim() || existing.ram,
        size: input.size?.trim() || existing.size,
        volumeValue: input.volumeValue != null ? String(input.volumeValue) : existing.volumeValue,
        volumeUnit: input.volumeUnit?.trim() || existing.volumeUnit,
        packCount: input.packCount ?? existing.packCount,
        shade: input.shade?.trim() || existing.shade,
        style: input.style?.trim() || existing.style,
        material: input.material?.trim() || existing.material,
        deepSpecifications: input.deepSpecifications || existing.deepSpecifications,
        identityConfidence: newConfidence,
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, existing.id))
      .returning();

    return updated;
  }
}

export const productRepository = new ProductRepository();
