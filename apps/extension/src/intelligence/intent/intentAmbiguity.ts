import type { RecommendationRequest, IntentAmbiguity } from "../recommendationTypes";

function normalizeValString(val: any): string {
  if (Array.isArray(val)) {
    return val.map(v => String(v).toLowerCase()).sort().join(",");
  }
  return String(val ?? "").toLowerCase().trim();
}

/**
 * Deterministically analyzes soft intent tensions and ambiguities within a RecommendationRequest.
 * Multi-objective preferences across different attributes remain compatible.
 * Does NOT resolve tensions, promote preferences, or mutate the input request.
 *
 * @param request The RecommendationRequest to inspect.
 * @returns Array of IntentAmbiguity items.
 */
export function analyzeIntentAmbiguity(
  request: RecommendationRequest | null | undefined
): IntentAmbiguity[] {
  if (!request) {
    return [];
  }

  const ambiguities: IntentAmbiguity[] = [];

  const hardConstraints = (Array.isArray(request.hardConstraints) ? request.hardConstraints : []).filter(Boolean);
  const explicitRequirements = (Array.isArray(request.explicitRequirements) ? request.explicitRequirements : []).filter(Boolean);
  const userPreferences = (Array.isArray(request.userPreferences) ? request.userPreferences : []).filter(Boolean);

  // 1. Constraint vs Preference Tensions (e.g., hard brand Samsung vs preference Apple)
  for (const hc of hardConstraints) {
    for (const up of userPreferences) {
      const upAttr = up.key === "brand_loyalty" ? "brand" : up.key;
      if (hc.attribute !== upAttr) continue;

      const hcValNorm = normalizeValString(hc.value);
      const upValNorm = normalizeValString(up.value);

      if (hcValNorm !== upValNorm && upValNorm !== "preferred" && upValNorm !== "high") {
        ambiguities.push({
          type: "constraint_preference_tension",
          attribute: hc.attribute,
          message: `Hard constraint '${hc.value}' exists alongside soft preference '${up.value}' for ${hc.attribute}`,
          sources: ["hard_constraint", "user_preference"],
          severity: "low"
        });
      }
    }
  }

  // 2. Requirement vs Preference Tensions (e.g., explicit 256GB vs preference 512GB)
  const mandatoryReqs = explicitRequirements.filter(er => er.isMandatory !== false);
  for (const er of mandatoryReqs) {
    for (const up of userPreferences) {
      const upAttr = up.key === "brand_loyalty" ? "brand" : up.key;
      if (er.attribute !== upAttr) continue;

      const erValNorm = normalizeValString(er.value);
      const upValNorm = normalizeValString(up.value);

      if (erValNorm !== upValNorm && upValNorm !== "preferred" && upValNorm !== "high") {
        ambiguities.push({
          type: "requirement_preference_tension",
          attribute: er.attribute,
          message: `Explicit requirement '${er.value}' exists alongside soft preference '${up.value}' for ${er.attribute}`,
          sources: ["explicit_requirement", "user_preference"],
          severity: "low"
        });
      }
    }
  }

  // 3. Preference Tensions (multiple preferences on the SAME attribute with differing values)
  for (let i = 0; i < userPreferences.length; i++) {
    for (let j = i + 1; j < userPreferences.length; j++) {
      const up1 = userPreferences[i];
      const up2 = userPreferences[j];

      const attr1 = up1.key === "brand_loyalty" ? "brand" : up1.key;
      const attr2 = up2.key === "brand_loyalty" ? "brand" : up2.key;

      if (attr1 !== attr2) continue; // Multi-objective preferences on different attributes are compatible!

      const val1Norm = normalizeValString(up1.value);
      const val2Norm = normalizeValString(up2.value);

      if (val1Norm !== val2Norm && val1Norm !== "preferred" && val2Norm !== "preferred" && val1Norm !== "high" && val2Norm !== "high") {
        ambiguities.push({
          type: "preference_tension",
          attribute: attr1,
          message: `Multiple preferences for ${attr1}: '${up1.value}' vs '${up2.value}'`,
          sources: ["user_preference", "user_preference"],
          severity: "low"
        });
      }
    }
  }

  // 4. Ambiguous Requirements (non-mandatory explicit requirements with differing values on same attribute)
  const nonMandatoryReqs = explicitRequirements.filter(er => er.isMandatory === false);
  for (let i = 0; i < nonMandatoryReqs.length; i++) {
    for (let j = i + 1; j < nonMandatoryReqs.length; j++) {
      const er1 = nonMandatoryReqs[i];
      const er2 = nonMandatoryReqs[j];

      if (er1.attribute !== er2.attribute) continue;

      const val1Norm = normalizeValString(er1.value);
      const val2Norm = normalizeValString(er2.value);

      if (val1Norm !== val2Norm) {
        ambiguities.push({
          type: "ambiguous_requirement",
          attribute: er1.attribute,
          message: `Multiple non-mandatory explicit requirements for ${er1.attribute}: '${er1.value}' vs '${er2.value}'`,
          sources: ["explicit_requirement", "explicit_requirement"],
          severity: "medium"
        });
      }
    }
  }

  return ambiguities;
}
