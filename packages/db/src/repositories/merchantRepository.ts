import { eq } from "drizzle-orm";
import { merchants, type Merchant, type NewMerchant } from "../schema/merchants";
import type { DatabaseOrTx } from "./types";

export interface UpsertMerchantInput {
  name: string;
  hostname: string;
  domain: string;
  logoUrl?: string | null;
  trustScore?: number;
  isRecognizedPlatform?: boolean;
  reliabilityTier?: string;
}

export class MerchantRepository {
  async findByHostname(db: DatabaseOrTx, hostname: string): Promise<Merchant | null> {
    const cleanHostname = hostname.trim().toLowerCase().replace(/^www\./, "");
    const rows = await db
      .select()
      .from(merchants)
      .where(eq(merchants.hostname, cleanHostname))
      .limit(1);
    return rows[0] || null;
  }

  async upsertMerchant(db: DatabaseOrTx, input: UpsertMerchantInput): Promise<Merchant> {
    const cleanHostname = input.hostname.trim().toLowerCase().replace(/^www\./, "");
    const cleanDomain = input.domain.trim().toLowerCase().replace(/^www\./, "");
    const cleanName = input.name.trim();

    const existing = await this.findByHostname(db, cleanHostname);

    if (!existing) {
      const [inserted] = await db
        .insert(merchants)
        .values({
          name: cleanName,
          hostname: cleanHostname,
          domain: cleanDomain,
          logoUrl: input.logoUrl || null,
          trustScore: input.trustScore ?? 75,
          isRecognizedPlatform: input.isRecognizedPlatform ?? false,
          reliabilityTier: input.reliabilityTier || "identified_merchant",
        })
        .returning();
      return inserted;
    }

    const [updated] = await db
      .update(merchants)
      .set({
        name: cleanName,
        domain: cleanDomain,
        logoUrl: input.logoUrl || existing.logoUrl,
        trustScore: input.trustScore ?? existing.trustScore,
        isRecognizedPlatform: input.isRecognizedPlatform ?? existing.isRecognizedPlatform,
        reliabilityTier: input.reliabilityTier || existing.reliabilityTier,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, existing.id))
      .returning();

    return updated;
  }
}

export const merchantRepository = new MerchantRepository();
