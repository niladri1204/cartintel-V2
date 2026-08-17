import type { RecommendationRequest, RequirementPriority } from "../recommendationTypes";

/**
 * Deterministically builds a requirement priority model from a RecommendationRequest.
 * Maps extracted intent into categorical priority levels ("critical", "high", "medium", "low").
 * Preserves stable combined source ordering, values, and operators without mutating the request or scoring candidates.
 *
 * @param request The RecommendationRequest containing extracted intent.
 * @returns Array of RequirementPriority objects preserved in stable source order.
 */
export function buildRequirementPriorities(
  request: RecommendationRequest | null | undefined
): RequirementPriority[] {
  if (!request) {
    return [];
  }

  const result: RequirementPriority[] = [];
  let globalIndex = 0;

  // 1. Process Hard Constraints -> priority "critical"
  if (Array.isArray(request.hardConstraints)) {
    for (const hc of request.hardConstraints) {
      if (!hc || !hc.attribute) continue;
      result.push({
        source: "hard_constraint",
        attribute: hc.attribute,
        value: hc.value,
        priority: "critical",
        operator: hc.operator,
        originalIndex: globalIndex++
      });
    }
  }

  // 2. Process Explicit Requirements -> priority "high" (mandatory) or "medium" (non-mandatory)
  if (Array.isArray(request.explicitRequirements)) {
    for (const er of request.explicitRequirements) {
      if (!er || !er.attribute) continue;
      const isMandatory = er.isMandatory !== false;
      result.push({
        source: "explicit_requirement",
        attribute: er.attribute,
        value: er.value,
        priority: isMandatory ? "high" : "medium",
        operator: er.operator,
        originalIndex: globalIndex++
      });
    }
  }

  // 3. Process User Preferences -> priority "medium"
  if (Array.isArray(request.userPreferences)) {
    for (const up of request.userPreferences) {
      if (!up || !up.key) continue;
      result.push({
        source: "user_preference",
        attribute: up.key,
        value: up.value,
        priority: "medium",
        originalIndex: globalIndex++
      });
    }
  }

  return result;
}
