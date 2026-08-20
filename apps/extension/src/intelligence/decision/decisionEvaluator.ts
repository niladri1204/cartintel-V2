import type {
  RecommendationRequest,
  RecommendationCandidate,
  HardConstraint,
  ExplicitRequirement,
  UserPreference
} from "../recommendationTypes";
import type {
  HardConstraintEvaluation,
  ExplicitRequirementEvaluation,
  PreferenceEvaluation,
  CandidateDecisionEvaluation,
  DecisionEvaluationResult
} from "./decisionTypes";
import { evaluateElectronicsRequirementSingle, resolveSpecKey } from "../electronicsRequirement";

function parseSpecNumber(val: any): number | null {
  if (typeof val === "number") return val;
  if (!val) return null;
  const str = String(val).trim().toLowerCase();
  const m = str.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function getCandidateAttribute(candidate: RecommendationCandidate, attr: string): string | null {
  const normAttr = attr.toLowerCase().trim();
  const prod = candidate.product;
  if (!prod) return null;

  if (normAttr === "brand" && prod.brand) return prod.brand;
  if (normAttr === "category" && prod.category) return prod.category;
  if (normAttr === "storage" && prod.storage) return prod.storage;
  if (normAttr === "ram" && prod.ram) return prod.ram;
  if (normAttr === "color" && prod.color) return prod.color;
  if (normAttr === "size" && prod.size) return prod.size;
  if (normAttr === "material" && prod.material) return prod.material;

  if (Array.isArray(prod.attributes)) {
    const found = prod.attributes.find(a => typeof a === "string" && a.toLowerCase().trim() === normAttr);
    if (found) return found;
  }

  // Fallback: check normalized title / original title if needed
  const title = (prod.normalizedTitle || prod.originalTitle || "").toLowerCase();
  if (normAttr === "color") {
    const colorMatch = title.match(/\b(black|white|blue|red|green|silver|gold|pink|purple|gray|grey|obsidian|hazel|porcelain)\b/i);
    if (colorMatch) return colorMatch[1];
  }
  if (normAttr === "storage") {
    const storageMatch = title.match(/\b(\d+)\s*(gb|tb)\b/i);
    if (storageMatch) return `${storageMatch[1]}${storageMatch[2].toUpperCase()}`;
  }
  if (normAttr === "ram") {
    const ramMatch = title.match(/\b(\d+)\s*gb\s*(?:ram|memory)\b/i);
    if (ramMatch) return `${ramMatch[1]}GB`;
  }
  if (normAttr === "size") {
    const sizeMatch = title.match(/\b(\d+(?:\.\d+)?)\s*(?:inch|in|\")\b/i);
    if (sizeMatch) return `${sizeMatch[1]} inch`;
  }
  if (normAttr === "weight") {
    const weightMatch = title.match(/\b(\d+(?:\.\d+)?)\s*(?:kg|g)\b/i);
    if (weightMatch) return `${weightMatch[1]}${weightMatch[2].toLowerCase()}`;
  }

  return null;
}

export function evaluateHardConstraint(
  hc: HardConstraint,
  candidate: RecommendationCandidate
): HardConstraintEvaluation {
  const normAttr = hc.attribute.toLowerCase().trim();

  // Price constraint evaluation
  if (normAttr === "price") {
    const price = candidate.product?.originalPrice;
    if (price == null || typeof price !== "number") {
      return { constraint: hc, status: "unknown", reason: "Candidate price unavailable" };
    }
    const targetPrice = parseSpecNumber(hc.value);
    if (targetPrice == null) {
      return { constraint: hc, status: "unknown", reason: "Constraint target price invalid" };
    }

    const op = hc.operator || "less_than";
    let isSatisfied = false;

    if (op === "less_than") isSatisfied = price < targetPrice;
    else if (op === "less_than_or_equal") isSatisfied = price <= targetPrice;
    else if (op === "greater_than") isSatisfied = price > targetPrice;
    else if (op === "greater_than_or_equal") isSatisfied = price >= targetPrice;
    else if (op === "equals") isSatisfied = price === targetPrice;

    return isSatisfied
      ? { constraint: hc, status: "satisfied" }
      : { constraint: hc, status: "violated", reason: `Price ${price} violates ${op} ${targetPrice}` };
  }

  // Condition constraint evaluation
  if (normAttr === "condition") {
    const isRefurbished = Boolean(candidate.isRefurbishedOrUsed);
    const targetCond = String(hc.value).toLowerCase().trim();

    if (targetCond === "new") {
      return !isRefurbished
        ? { constraint: hc, status: "satisfied" }
        : { constraint: hc, status: "violated", reason: "Refurbished or used offer excluded for new condition" };
    }
    if (targetCond === "refurbished" || targetCond === "used") {
      return isRefurbished
        ? { constraint: hc, status: "satisfied" }
        : { constraint: hc, status: "violated", reason: "New offer excluded for refurbished/used condition" };
    }
  }

  // General attribute evaluation (brand, storage, RAM, size, weight, color, etc.)
  const candidateVal = getCandidateAttribute(candidate, hc.attribute);
  if (candidateVal == null) {
    return { constraint: hc, status: "unknown", reason: `Candidate ${hc.attribute} data unavailable` };
  }

  const op = hc.operator || "equals";
  const targetValStr = String(hc.value).toLowerCase().trim();
  const candValStr = candidateVal.toLowerCase().trim();

  // Numeric comparisons for RAM, storage, size, weight
  if (["storage", "ram", "size", "weight"].includes(normAttr)) {
    const cNum = parseSpecNumber(candValStr);
    const tNum = parseSpecNumber(targetValStr);

    if (cNum != null && tNum != null && op !== "equals") {
      let isSat = false;
      if (op === "less_than") isSat = cNum < tNum;
      else if (op === "less_than_or_equal") isSat = cNum <= tNum;
      else if (op === "greater_than") isSat = cNum > tNum;
      else if (op === "greater_than_or_equal") isSat = cNum >= tNum;

      return isSat
        ? { constraint: hc, status: "satisfied" }
        : { constraint: hc, status: "violated", reason: `${hc.attribute} ${candValStr} violates ${op} ${targetValStr}` };
    }
  }

  // String equality / set inclusion
  let isSat = false;
  if (op === "equals") {
    isSat = candValStr === targetValStr;
  } else if (op === "in" && Array.isArray(hc.value)) {
    isSat = (hc.value as any[]).map(v => String(v).toLowerCase().trim()).includes(candValStr);
  } else if (op === "not_in" && Array.isArray(hc.value)) {
    isSat = !(hc.value as any[]).map(v => String(v).toLowerCase().trim()).includes(candValStr);
  }

  return isSat
    ? { constraint: hc, status: "satisfied" }
    : { constraint: hc, status: "violated", reason: `${hc.attribute} '${candValStr}' does not match '${targetValStr}'` };
}

export function evaluateExplicitRequirement(
  er: ExplicitRequirement,
  candidate: RecommendationCandidate
): ExplicitRequirementEvaluation {
  const prod = candidate.product;
  if (prod && prod.category === "Electronics" && resolveSpecKey(er.attribute) !== null) {
    const fit = evaluateElectronicsRequirementSingle(er, prod);
    let status: "matched" | "not_matched" | "unknown" = "unknown";
    if (fit.status === "satisfied") status = "matched";
    else if (fit.status === "not_satisfied") status = "not_matched";
    return {
      requirement: er,
      status,
      reason: fit.explanation
    };
  }

  const candVal = getCandidateAttribute(candidate, er.attribute);
  if (candVal == null) {
    return { requirement: er, status: "unknown", reason: `Candidate ${er.attribute} data unavailable` };
  }

  const op = er.operator || "equals";
  const targetValStr = String(er.value).toLowerCase().trim();
  const candValStr = candVal.toLowerCase().trim();

  const cNum = parseSpecNumber(candValStr);
  const tNum = parseSpecNumber(targetValStr);

  if (cNum != null && tNum != null && op !== "equals") {
    let isMatched = false;
    if (op === "greater_than" || op === "greater_than_or_equal") isMatched = cNum >= tNum;
    else if (op === "less_than" || op === "less_than_or_equal") isMatched = cNum <= tNum;

    return isMatched
      ? { requirement: er, status: "matched" }
      : { requirement: er, status: "not_matched", reason: `${er.attribute} ${candValStr} does not satisfy ${op} ${targetValStr}` };
  }

  let isMatched = false;
  if (op === "equals") {
    isMatched = candValStr === targetValStr;
  } else if (op === "contains" || op === "matches") {
    isMatched = candValStr.includes(targetValStr) || targetValStr.includes(candValStr);
  }

  return isMatched
    ? { requirement: er, status: "matched" }
    : { requirement: er, status: "not_matched", reason: `${er.attribute} '${candValStr}' does not match '${targetValStr}'` };
}

export function evaluateUserPreference(
  pref: UserPreference,
  candidate: RecommendationCandidate
): PreferenceEvaluation {
  const normKey = (pref.key || "").toLowerCase().trim();

  if (normKey === "brand_loyalty") {
    const cBrand = getCandidateAttribute(candidate, "brand");
    if (cBrand == null) {
      return { preference: pref, status: "unknown", reason: "Candidate brand data unavailable" };
    }
    const isMatch = cBrand.toLowerCase().trim() === String(pref.value).toLowerCase().trim();
    return isMatch
      ? { preference: pref, status: "strongly_matched" }
      : { preference: pref, status: "not_matched", reason: `Candidate brand ${cBrand} differs from preferred ${pref.value}` };
  }

  if (normKey === "display") {
    const title = (candidate.product?.normalizedTitle || candidate.product?.originalTitle || "").toLowerCase();
    const targetDisplay = String(pref.value).toLowerCase().trim();
    if (title.includes(targetDisplay)) {
      return { preference: pref, status: "strongly_matched" };
    }
    const candDisplay = getCandidateAttribute(candidate, "display");
    if (candDisplay == null) {
      return { preference: pref, status: "unknown", reason: "Candidate display data unavailable" };
    }
    return candDisplay.toLowerCase().includes(targetDisplay)
      ? { preference: pref, status: "strongly_matched" }
      : { preference: pref, status: "not_matched" };
  }

  if (normKey === "storage" || normKey === "ram") {
    const candSpec = getCandidateAttribute(candidate, normKey);
    if (candSpec == null) {
      return { preference: pref, status: "unknown", reason: `Candidate ${normKey} data unavailable` };
    }
    const isMatch = candSpec.toLowerCase().trim() === String(pref.value).toLowerCase().trim();
    return isMatch
      ? { preference: pref, status: "strongly_matched" }
      : { preference: pref, status: "not_matched" };
  }

  // Subjective preferences (cheap, camera, battery, performance, value, etc.):
  // Do NOT invent arbitrary numeric thresholds. Check if candidate title/attributes mention the preference.
  const title = (candidate.product?.normalizedTitle || candidate.product?.originalTitle || "").toLowerCase();
  if (title.includes(normKey)) {
    return { preference: pref, status: "strongly_matched" };
  }

  return { preference: pref, status: "unknown", reason: `Preference '${pref.key}' cannot be deterministically scored without candidate metadata` };
}

export function evaluateDecisionInputs(
  request: RecommendationRequest | null | undefined,
  candidates?: RecommendationCandidate[]
): DecisionEvaluationResult {
  const req: RecommendationRequest = request || { candidates: [] };
  const candList = candidates || req.candidates || [];

  const hardConstraints = req.hardConstraints || [];
  const explicitRequirements = req.explicitRequirements || [];
  const userPreferences = req.userPreferences || [];

  const evaluations: CandidateDecisionEvaluation[] = [];

  for (const candidate of candList) {
    const hcEvals = hardConstraints.map(hc => evaluateHardConstraint(hc, candidate));
    const erEvals = explicitRequirements.map(er => evaluateExplicitRequirement(er, candidate));
    const prefEvals = userPreferences.map(pref => evaluateUserPreference(pref, candidate));

    // Determine eligibility:
    // - ineligible if ANY hard constraint is violated
    // - unknown if no hard constraint is violated, but at least one hard constraint is unknown
    // - eligible if all hard constraints are satisfied (or 0 hard constraints exist)
    const hasViolation = hcEvals.some(e => e.status === "violated");
    const hasUnknown = hcEvals.some(e => e.status === "unknown");

    let eligibility: "eligible" | "ineligible" | "unknown" = "eligible";
    if (hasViolation) {
      eligibility = "ineligible";
    } else if (hasUnknown) {
      eligibility = "unknown";
    }

    let matchedCount = 0;
    let violatedCount = 0;
    let unknownCount = 0;

    for (const e of hcEvals) {
      if (e.status === "satisfied") matchedCount++;
      else if (e.status === "violated") violatedCount++;
      else if (e.status === "unknown") unknownCount++;
    }

    for (const e of erEvals) {
      if (e.status === "matched") matchedCount++;
      else if (e.status === "not_matched") {
        if (e.requirement.isMandatory !== false) violatedCount++;
      } else if (e.status === "unknown") unknownCount++;
    }

    for (const e of prefEvals) {
      if (e.status === "strongly_matched" || e.status === "partially_matched") matchedCount++;
      else if (e.status === "unknown") unknownCount++;
    }

    evaluations.push({
      candidate,
      eligibility,
      hardConstraintEvaluations: hcEvals,
      explicitRequirementEvaluations: erEvals,
      preferenceEvaluations: prefEvals,
      matchedCount,
      violatedCount,
      unknownCount
    });
  }

  const eligibleCandidates = evaluations.filter(e => e.eligibility === "eligible");
  const ineligibleCandidates = evaluations.filter(e => e.eligibility === "ineligible");

  return {
    request: req,
    evaluations,
    eligibleCandidates,
    ineligibleCandidates,
    evaluatedCount: evaluations.length
  };
}
