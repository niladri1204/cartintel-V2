import type { RecommendationRequest } from "../recommendationTypes";
import { normalizeQuery } from "./queryNormalizer";
import { extractProductContext } from "./categoryExtractor";
import { extractExplicitRequirements } from "./explicitRequirementExtractor";
import { extractHardConstraints } from "./hardConstraintExtractor";
import { extractUserPreferences } from "./userPreferenceExtractor";
import { buildRequirementPriorities } from "./requirementPriority";
import { detectIntentConflicts } from "./intentConflictDetector";
import { analyzeIntentAmbiguity } from "./intentAmbiguity";

/**
 * Single canonical builder for converting a raw shopping query into a complete structured RecommendationRequest.
 * Orchestrates query normalization, product context, explicit requirements, hard constraints, user preferences,
 * requirement priorities, conflict detection, and ambiguity classification.
 *
 * @param query Raw natural-language shopping query.
 * @returns Complete structured RecommendationRequest with candidates initialized to [].
 */
export function buildRecommendationRequest(query: string | null | undefined): RecommendationRequest {
  const originalQuery = typeof query === "string" ? query : "";
  const normalizedQuery = normalizeQuery(originalQuery);

  const productContext = extractProductContext(normalizedQuery);
  const explicitRequirements = extractExplicitRequirements(normalizedQuery);
  const hardConstraints = extractHardConstraints(normalizedQuery);
  const userPreferences = extractUserPreferences(normalizedQuery);

  const intermediateRequest: RecommendationRequest = {
    originalQuery,
    normalizedQuery,
    productContext,
    explicitRequirements,
    userPreferences,
    hardConstraints,
    candidates: []
  };

  const priorities = buildRequirementPriorities(intermediateRequest);
  const conflicts = detectIntentConflicts(intermediateRequest);
  const ambiguities = analyzeIntentAmbiguity(intermediateRequest);

  return {
    originalQuery,
    normalizedQuery,
    productContext,
    explicitRequirements,
    userPreferences,
    hardConstraints,
    priorities,
    conflicts,
    ambiguities,
    candidates: []
  };
}
