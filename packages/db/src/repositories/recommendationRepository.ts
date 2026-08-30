import { eq } from "drizzle-orm";
import {
  recommendationSessions,
  recommendationOffers,
  type RecommendationSession,
  type RecommendationOffer,
} from "../schema/recommendations";
import type { DatabaseOrTx } from "./types";

export interface CreateRecommendationSessionInput {
  sessionToken?: string | null;
  queryText?: string | null;
  anchorVariantId?: string | null;
  cheapestOfferId?: string | null;
  bestValueOfferId?: string | null;
  status: string;
  confidence: number;
  decisionReasons?: any;
  tradeOffs?: any;
}

export interface RecommendationOfferAssociation {
  offerId: string;
  offerRole: string; // "cheapest" | "best_value" | "eligible" | "alternative" | "ineligible"
  rankingTier?: number | null;
  finalScore?: number | string | null;
}

export class RecommendationRepository {
  async createSession(
    db: DatabaseOrTx,
    sessionData: CreateRecommendationSessionInput,
    offersToAssociate: RecommendationOfferAssociation[]
  ): Promise<RecommendationSession> {
    const [session] = await db
      .insert(recommendationSessions)
      .values({
        sessionToken: sessionData.sessionToken || null,
        queryText: sessionData.queryText || null,
        anchorVariantId: sessionData.anchorVariantId || null,
        cheapestOfferId: sessionData.cheapestOfferId || null,
        bestValueOfferId: sessionData.bestValueOfferId || null,
        status: sessionData.status,
        confidence: sessionData.confidence,
        decisionReasons: sessionData.decisionReasons || null,
        tradeOffs: sessionData.tradeOffs || null,
      })
      .returning();

    if (offersToAssociate && offersToAssociate.length > 0) {
      const rows = offersToAssociate.map((o) => ({
        sessionId: session.id,
        offerId: o.offerId,
        offerRole: o.offerRole,
        rankingTier: o.rankingTier ?? null,
        finalScore: o.finalScore != null ? String(o.finalScore) : null,
      }));

      await db.insert(recommendationOffers).values(rows);
    }

    return session;
  }

  async getSessionWithOffers(
    db: DatabaseOrTx,
    sessionId: string
  ): Promise<{
    session: RecommendationSession | null;
    offers: RecommendationOffer[];
  }> {
    const sessionRows = await db
      .select()
      .from(recommendationSessions)
      .where(eq(recommendationSessions.id, sessionId))
      .limit(1);

    if (sessionRows.length === 0) {
      return { session: null, offers: [] };
    }

    const offerRows = await db
      .select()
      .from(recommendationOffers)
      .where(eq(recommendationOffers.sessionId, sessionId));

    return { session: sessionRows[0], offers: offerRows };
  }
}

export const recommendationRepository = new RecommendationRepository();
