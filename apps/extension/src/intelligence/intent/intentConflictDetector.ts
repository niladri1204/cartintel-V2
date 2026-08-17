import type { RecommendationRequest, IntentConflict, HardConstraint, ExplicitRequirement, UserPreference } from "../recommendationTypes";

/**
 * Parses numeric value from a string or number (e.g., 50000, "50000", "256GB" -> 256, "1TB" -> 1024).
 * Returns null if non-numeric or unparseable.
 */
function parseNumericValue(val: any): number | null {
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }
  if (typeof val !== "string") {
    return null;
  }
  const clean = val.trim().toLowerCase();
  if (clean.endsWith("tb")) {
    const num = parseFloat(clean);
    return isNaN(num) ? null : Math.round(num * 1024);
  }
  const match = clean.match(/^(\d+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

/**
 * Normalizes values into comparable string representations.
 */
function normalizeValString(val: any): string {
  if (Array.isArray(val)) {
    return val.map(v => String(v).toLowerCase()).sort().join(",");
  }
  return String(val ?? "").toLowerCase().trim();
}

/**
 * Deterministically detects inconsistencies, contradictions, and tensions within a RecommendationRequest.
 * Does NOT resolve conflicts, score candidates, or mutate the input request.
 *
 * @param request The RecommendationRequest to inspect.
 * @returns Array of IntentConflict items.
 */
export function detectIntentConflicts(
  request: RecommendationRequest | null | undefined
): IntentConflict[] {
  if (!request) {
    return [];
  }

  const conflicts: IntentConflict[] = [];

  const hardConstraints = (Array.isArray(request.hardConstraints) ? request.hardConstraints : []).filter(Boolean);
  const explicitRequirements = (Array.isArray(request.explicitRequirements) ? request.explicitRequirements : []).filter(Boolean);
  const userPreferences = (Array.isArray(request.userPreferences) ? request.userPreferences : []).filter(Boolean);

  // 1. Hard-vs-Hard Conflicts
  for (let i = 0; i < hardConstraints.length; i++) {
    for (let j = i + 1; j < hardConstraints.length; j++) {
      const hc1 = hardConstraints[i];
      const hc2 = hardConstraints[j];

      if (hc1.attribute !== hc2.attribute) continue;

      const normVal1 = normalizeValString(hc1.value);
      const normVal2 = normalizeValString(hc2.value);

      // Compatible identical duplicates
      if (hc1.operator === hc2.operator && normVal1 === normVal2) {
        continue;
      }

      // Check numeric bounds range conflict
      const num1 = parseNumericValue(hc1.value);
      const num2 = parseNumericValue(hc2.value);

      if (num1 !== null && num2 !== null) {
        const isLess1 = hc1.operator === "less_than" || hc1.operator === "less_than_or_equal";
        const isGreater1 = hc1.operator === "greater_than" || hc1.operator === "greater_than_or_equal";

        const isLess2 = hc2.operator === "less_than" || hc2.operator === "less_than_or_equal";
        const isGreater2 = hc2.operator === "greater_than" || hc2.operator === "greater_than_or_equal";

        if (isLess1 && isGreater2) {
          const isStrict = hc1.operator === "less_than" || hc2.operator === "greater_than";
          if (num1 < num2 || (num1 === num2 && isStrict)) {
            conflicts.push({
              type: "hard_conflict",
              attribute: hc1.attribute,
              message: `Incompatible numeric bounds on ${hc1.attribute}: upper bound ${num1} conflicts with lower bound ${num2}`,
              sources: ["hard_constraint", "hard_constraint"],
              severity: "high"
            });
            continue;
          }
        }

        if (isGreater1 && isLess2) {
          const isStrict = hc1.operator === "greater_than" || hc2.operator === "less_than";
          if (num1 > num2 || (num1 === num2 && isStrict)) {
            conflicts.push({
              type: "hard_conflict",
              attribute: hc1.attribute,
              message: `Incompatible numeric bounds on ${hc1.attribute}: lower bound ${num1} conflicts with upper bound ${num2}`,
              sources: ["hard_constraint", "hard_constraint"],
              severity: "high"
            });
            continue;
          }
        }
      }

      // Check equals vs equals brand/condition/categorical conflict
      if (hc1.operator === "equals" && hc2.operator === "equals" && normVal1 !== normVal2) {
        conflicts.push({
          type: "hard_conflict",
          attribute: hc1.attribute,
          message: `Contradictory hard constraints on ${hc1.attribute}: '${hc1.value}' vs '${hc2.value}'`,
          sources: ["hard_constraint", "hard_constraint"],
          severity: "high"
        });
        continue;
      }

      // Check condition equals vs not_in conflict
      if (hc1.operator === "equals" && hc2.operator === "not_in") {
        const excludedVals = Array.isArray(hc2.value) ? hc2.value.map(normalizeValString) : [normalizeValString(hc2.value)];
        if (excludedVals.includes(normVal1)) {
          conflicts.push({
            type: "hard_conflict",
            attribute: hc1.attribute,
            message: `Hard constraint requiring condition '${hc1.value}' conflicts with excluded list`,
            sources: ["hard_constraint", "hard_constraint"],
            severity: "high"
          });
        }
      }
    }
  }

  // 2. Explicit Requirement Conflicts
  const mandatoryReqs = explicitRequirements.filter(er => er.isMandatory !== false);
  for (let i = 0; i < mandatoryReqs.length; i++) {
    for (let j = i + 1; j < mandatoryReqs.length; j++) {
      const er1 = mandatoryReqs[i];
      const er2 = mandatoryReqs[j];

      if (er1.attribute !== er2.attribute) continue;

      const normVal1 = normalizeValString(er1.value);
      const normVal2 = normalizeValString(er2.value);

      if (normVal1 !== normVal2) {
        conflicts.push({
          type: "requirement_conflict",
          attribute: er1.attribute,
          message: `Contradictory mandatory requirements on ${er1.attribute}: '${er1.value}' vs '${er2.value}'`,
          sources: ["explicit_requirement", "explicit_requirement"],
          severity: "high"
        });
      }
    }
  }

  // 3. Hard Constraint vs Explicit Requirement Conflicts
  for (const hc of hardConstraints) {
    for (const er of mandatoryReqs) {
      if (hc.attribute !== er.attribute) continue;

      const hcValNorm = normalizeValString(hc.value);
      const erValNorm = normalizeValString(er.value);

      if (hc.operator === "equals" && hcValNorm !== erValNorm) {
        conflicts.push({
          type: "hard_conflict",
          attribute: hc.attribute,
          message: `Hard constraint requiring ${hc.attribute}='${hc.value}' conflicts with explicit requirement '${er.value}'`,
          sources: ["hard_constraint", "explicit_requirement"],
          severity: "high"
        });
        continue;
      }

      const hcNum = parseNumericValue(hc.value);
      const erNum = parseNumericValue(er.value);

      if (hcNum !== null && erNum !== null) {
        let isViolated = false;
        if (hc.operator === "less_than" && erNum >= hcNum) isViolated = true;
        if (hc.operator === "less_than_or_equal" && erNum > hcNum) isViolated = true;
        if (hc.operator === "greater_than" && erNum <= hcNum) isViolated = true;
        if (hc.operator === "greater_than_or_equal" && erNum < hcNum) isViolated = true;

        if (isViolated) {
          conflicts.push({
            type: "hard_conflict",
            attribute: hc.attribute,
            message: `Explicit requirement ${er.attribute}=${er.value} violates hard constraint boundary ${hc.operator} ${hc.value}`,
            sources: ["hard_constraint", "explicit_requirement"],
            severity: "high"
          });
        }
      }
    }
  }

  // 4. Hard Constraint vs User Preference Tensions
  for (const hc of hardConstraints) {
    for (const up of userPreferences) {
      const upAttr = up.key === "brand_loyalty" ? "brand" : up.key;
      if (hc.attribute !== upAttr) continue;

      const hcValNorm = normalizeValString(hc.value);
      const upValNorm = normalizeValString(up.value);

      if (hcValNorm !== upValNorm && upValNorm !== "preferred" && upValNorm !== "high") {
        conflicts.push({
          type: "hard_vs_preference",
          attribute: hc.attribute,
          message: `Preference for ${upAttr}='${up.value}' differs from hard constraint '${hc.value}'`,
          sources: ["hard_constraint", "user_preference"],
          severity: "low"
        });
      }
    }
  }

  // 5. Requirement vs Preference Tensions
  for (const er of mandatoryReqs) {
    for (const up of userPreferences) {
      const upAttr = up.key === "brand_loyalty" ? "brand" : up.key;
      if (er.attribute !== upAttr) continue;

      const erValNorm = normalizeValString(er.value);
      const upValNorm = normalizeValString(up.value);

      if (erValNorm !== upValNorm && upValNorm !== "preferred" && upValNorm !== "high") {
        conflicts.push({
          type: "preference_conflict",
          attribute: er.attribute,
          message: `Preference for ${upAttr}='${up.value}' differs from explicit requirement '${er.value}'`,
          sources: ["explicit_requirement", "user_preference"],
          severity: "low"
        });
      }
    }
  }

  return conflicts;
}
