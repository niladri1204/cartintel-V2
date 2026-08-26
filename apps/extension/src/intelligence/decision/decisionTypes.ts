import type { ProductIntelligence } from "../types";
import type {
  RecommendationRequest,
  RecommendationCandidate,
  HardConstraint,
  ExplicitRequirement,
  UserPreference,
  ProductOfferExplanationDetails
} from "../recommendationTypes";
export type { ProductOfferExplanationDetails };

export interface HardConstraintEvaluation {
  constraint: HardConstraint;
  status: "satisfied" | "violated" | "unknown";
  reason?: string;
}

export interface ExplicitRequirementEvaluation {
  requirement: ExplicitRequirement;
  status: "matched" | "not_matched" | "unknown";
  reason?: string;
}

export interface PreferenceEvaluation {
  preference: UserPreference;
  status: "strongly_matched" | "partially_matched" | "not_matched" | "unknown";
  reason?: string;
}

export interface CandidateDecisionEvaluation {
  candidate: RecommendationCandidate;
  eligibility: "eligible" | "ineligible" | "unknown";
  hardConstraintEvaluations: HardConstraintEvaluation[];
  explicitRequirementEvaluations: ExplicitRequirementEvaluation[];
  preferenceEvaluations: PreferenceEvaluation[];
  matchedCount: number;
  violatedCount: number;
  unknownCount: number;
}

export interface DecisionEvaluationResult {
  request: RecommendationRequest;
  evaluations: CandidateDecisionEvaluation[];
  eligibleCandidates: CandidateDecisionEvaluation[];
  ineligibleCandidates: CandidateDecisionEvaluation[];
  evaluatedCount: number;
}

export interface DecisionUtilityBreakdown {
  eligibilityScore: number;
  requirementScore: number;
  preferenceScore: number;
  rankingScoreComponent: number;
  valueScore: number;
  finalDecisionScore: number;
}

export interface DecisionTradeOff {
  aspect: string;
  positiveImpact: string;
  negativeImpact: string;
}

export interface ScoredCandidateEvaluation extends CandidateDecisionEvaluation {
  utilityBreakdown: DecisionUtilityBreakdown;
  decisionScore: number;
  tradeOffs: DecisionTradeOff[];
}

export interface DecisionSelectionResult extends DecisionEvaluationResult {
  scoredEvaluations: ScoredCandidateEvaluation[];
  recommendedCandidate: RecommendationCandidate | null;
  recommendationScore: number;
  tradeOffs: DecisionTradeOff[];
}

export interface ProductDecisionGroup {
  fingerprint: string;
  product: ProductIntelligence;
  offers: RecommendationCandidate[];
  bestIdentityConfidence: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  averagePrice: number | null;
  currency: string | null;
  marketplaces: string[];
  productFitScore: number;
  requirementFitScore: number;
  preferenceFitScore: number;
  isEligible: boolean;
}

export interface ProductDecisionResult {
  request: RecommendationRequest;
  productGroups: ProductDecisionGroup[];
  bestProductGroup: ProductDecisionGroup | null;
  productScore: number;
  evaluatedProductCount: number;
}

export interface OfferDecisionResult {
  request: RecommendationRequest;
  productGroup: ProductDecisionGroup | null;
  bestOffer: RecommendationCandidate | null;
  cheapestOffer: RecommendationCandidate | null;
  bestValueOffer: RecommendationCandidate | null;
  allEligibleOffers?: RecommendationCandidate[];
  allOffers?: RecommendationCandidate[];
  eligibleOfferCount: number;
  evaluatedOfferCount: number;
}

export interface AlternativeProduct {
  product: ProductIntelligence;
  fingerprint: string;
  similarityScore: number;
  requirementFitScore: number;
  preferenceFitScore: number;
  identityConfidence: number;
  reason: string;
}

export interface AlternativeProductResult {
  recommendedProduct: ProductDecisionGroup | null;
  alternatives: AlternativeProduct[];
  evaluatedProductCount: number;
}

export interface RankedAlternativeProduct extends AlternativeProduct {
  alternativeScore: number;
  rank: number;
}

export interface AlternativeSelectionResult {
  recommendedProduct: ProductDecisionGroup | null;
  alternatives: RankedAlternativeProduct[];
  selectedAlternative: RankedAlternativeProduct | null;
  evaluatedAlternativeCount: number;
}
