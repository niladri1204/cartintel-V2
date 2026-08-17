import type { RecommendationRequest } from "../recommendationTypes";
import { buildRecommendationRequest } from "./recommendationRequestBuilder";

/**
 * Public Intent Extraction API.
 * Accepts a raw natural-language shopping query and delegates to buildRecommendationRequest,
 * establishing a single canonical construction path for RecommendationRequest.
 *
 * @param query The raw natural-language shopping query.
 */
export function extractUserIntent(query: string | null | undefined): RecommendationRequest {
  return buildRecommendationRequest(query);
}
