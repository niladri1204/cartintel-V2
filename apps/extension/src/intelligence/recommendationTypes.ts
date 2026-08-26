import type { ProductIntelligence } from "./types";
import type { RankedOffer, BestListingSelectionTier } from "./ranking";

export interface ProductContext {
  currentProduct?: ProductIntelligence | null;
  category?: string | null;
  brand?: string | null;
}

export interface ExplicitRequirement {
  attribute: string;      // e.g., "storage", "color", "brand"
  value: string | number | boolean | string[];
  operator?: "equals" | "greater_than" | "less_than" | "contains" | "matches" | "less_than_or_equal" | "greater_than_or_equal";
  isMandatory?: boolean;  // whether it's a hard constraint
}

export interface UserPreference {
  key: string;            // e.g., "brand_loyalty", "price_sensitivity", "delivery_speed"
  value: string | number | boolean | string[];
  weight?: number;        // e.g., importance score (0 to 1)
}

export interface HardConstraint {
  attribute: string;      // e.g., "price", "condition", "marketplace"
  operator: "less_than" | "greater_than" | "equals" | "in" | "not_in" | "less_than_or_equal" | "greater_than_or_equal";
  value: string | number | boolean | string[] | number[];
}

export interface RequirementPriority {
  source: "hard_constraint" | "explicit_requirement" | "user_preference";
  attribute: string;
  value: string | number | boolean | string[] | number[];
  priority: "critical" | "high" | "medium" | "low";
  operator?: string;
  originalIndex: number;
}

export interface IntentConflict {
  type: "hard_conflict" | "requirement_conflict" | "preference_conflict" | "hard_vs_preference";
  attribute: string;
  message: string;
  sources: Array<"hard_constraint" | "explicit_requirement" | "user_preference">;
  severity: "high" | "medium" | "low";
}

export interface IntentAmbiguity {
  type: "preference_tension" | "constraint_preference_tension" | "requirement_preference_tension" | "ambiguous_requirement";
  attribute: string;
  message: string;
  sources: Array<"hard_constraint" | "explicit_requirement" | "user_preference">;
  severity: "low" | "medium";
}

export interface RecommendationRequest {
  originalQuery?: string | null;
  normalizedQuery?: string | null;
  productContext?: ProductContext | null;
  explicitRequirements?: ExplicitRequirement[] | null;
  userPreferences?: UserPreference[] | null;
  hardConstraints?: HardConstraint[] | null;
  priorities?: RequirementPriority[] | null;
  conflicts?: IntentConflict[] | null;
  ambiguities?: IntentAmbiguity[] | null;
  candidates?: RecommendationCandidate[] | null;
}

export interface RecommendationCandidate extends RankedOffer {
  /**
   * The selection tier of the candidate from the ranking pipeline.
   */
  selectionTier?: BestListingSelectionTier | null;
}

export interface RecommendationReason {
  type: "price" | "quality" | "reputation" | "availability" | "preference_match" | "custom";
  message: string;
  scoreImpact?: number;
}

export interface DecisionTradeOff {
  aspect: string;
  positiveImpact: string;
  negativeImpact: string;
}

export interface DecisionAlternative {
  candidate: RecommendationCandidate;
  comparisonMessage: string;
  scoreDifference: number;
}

export interface DecisionConfidenceDetails {
  score: number; // 0 to 1
  factors: {
    dataCompleteness: number; // 0 to 1
    identityCertainty: number; // 0 to 1
    priceFreshness: number; // 0 to 1
  };
}

export interface DecisionMetadata {
  evaluatedCandidateCount: number;
  decisionAlgorithmVersion: string;
  processedAt: number;
  executionTimeMs: number;
}

export interface ProductOfferExplanationDetails {
  productReasons: RecommendationReason[];
  offerReasons: RecommendationReason[];
  bestProductSummary?: string;
  bestOfferSummary?: string;
  cheapestOfferSummary?: string;
  bestValueOfferSummary?: string;
}

export interface RecommendationResult {
  recommendedCandidate: RecommendationCandidate | null;
  recommendationScore: number;
  confidence: "high" | "medium" | "low";
  confidenceDetails: DecisionConfidenceDetails | null;
  reasons: RecommendationReason[];
  tradeOffs: DecisionTradeOff[];
  alternatives: DecisionAlternative[];
  metadata: DecisionMetadata;
  productOfferDetails?: ProductOfferExplanationDetails;
  bestOffer?: RecommendationCandidate | null;
  cheapestOffer?: RecommendationCandidate | null;
  bestValueOffer?: RecommendationCandidate | null;
  allEligibleOffers?: RecommendationCandidate[];
  allOffers?: RecommendationCandidate[];
  offers?: RecommendationCandidate[];
}
