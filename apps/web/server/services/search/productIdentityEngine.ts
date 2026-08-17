import type {
  IdentityCandidate,
  IdentityComparison,
  IdentitySignal,
} from "./identityTypes";

import {
  normalizeIdentityValue,
} from "./identityNormalizer";

import {
  findHardContradictions,
} from "./identityContradictions";

function compareField(
  field: string,
  source: string | null | undefined,
  candidate: string | null | undefined,
  weight: number
): IdentitySignal & { hasEvidence: boolean } {
  const sourceValue = normalizeIdentityValue(source);
  const candidateValue = normalizeIdentityValue(candidate);

  const hasEvidence = Boolean(sourceValue) && Boolean(candidateValue);

  const matched =
    hasEvidence && sourceValue === candidateValue;

  return {
    field,
    sourceValue: source ?? null,
    candidateValue: candidate ?? null,
    matched,
    weight,
    hasEvidence,
  };
}

export class ProductIdentityEngine {
  compare(
    source: IdentityCandidate,
    candidate: IdentityCandidate
  ): IdentityComparison {
    const rawSignals = [
      compareField("brand", source.brand, candidate.brand, 20),
      compareField("model", source.model, candidate.model, 30),
      compareField("variant", source.variant, candidate.variant, 15),
      compareField("category", source.category, candidate.category, 10),
      compareField("productType", source.productType, candidate.productType, 10),
      compareField("color", source.color, candidate.color, 5),
      compareField("size", source.size, candidate.size, 5),
      compareField("storage", source.storage, candidate.storage, 10),
      compareField("ram", source.ram, candidate.ram, 10),
    ];

    const signals: IdentitySignal[] = rawSignals.map(
      ({ hasEvidence, ...signal }) => signal
    );

    const contradictions = findHardContradictions(source, candidate);

    // --------------------------------------------------
    // EVIDENCE-AWARE IDENTITY SCORING
    // Architectural Rule: Missing evidence must NOT be treated as contradictory evidence.
    // An absent field in a candidate title (e.g. RAM or color missing in a web listing)
    // means evidence for that field is unavailable, not that the candidate mismatches.
    //
    // 1. Available Evidence Weight (denominator) includes ONLY fields where both candidate
    //    and source provide normalized evidence.
    // 2. Matched Weight (numerator) includes weights of fields where candidate evidence matches source.
    // 3. Score = matchedWeight / availableEvidenceWeight.
    // 4. Hard Contradictions (findHardContradictions) execute BEFORE scoring and immediately REJECT.
    // 5. Tier safeguards prevent a candidate with minimal evidence (e.g. brand only)
    //    from becoming EXACT or HIGH_CONFIDENCE without matching core model identity.
    // --------------------------------------------------

    const availableEvidenceWeight = rawSignals
      .filter((s) => s.hasEvidence)
      .reduce((sum, s) => sum + s.weight, 0);

    const matchedWeight = rawSignals
      .filter((s) => s.matched)
      .reduce((sum, s) => sum + s.weight, 0);

    const score =
      availableEvidenceWeight === 0
        ? 0
        : matchedWeight / availableEvidenceWeight;

    // HARD REJECTION
    if (contradictions.length > 0) {
      return {
        confidence: "REJECTED",
        score,
        signals,
        hardContradiction: true,
        reasons: contradictions.map((field) => `Conflicting ${field}`),
      };
    }

    const modelMatched = rawSignals.find((s) => s.field === "model")?.matched ?? false;
    const sourceHasModel = Boolean(normalizeIdentityValue(source.model));

    // Safeguard: If source specifies a model, candidate MUST match model to achieve EXACT or HIGH_CONFIDENCE.
    const modelRequirementMet = !sourceHasModel || modelMatched;

    // EXACT
    // Requires high score, model match requirement, and substantial positive evidence (brand + model + storage/variant, weight >= 60).
    if (score >= 0.95 && modelRequirementMet && matchedWeight >= 60) {
      return {
        confidence: "EXACT",
        score,
        signals,
        hardContradiction: false,
        reasons: ["All critical identity signals agree"],
      };
    }

    // HIGH CONFIDENCE
    // Requires high score, model match requirement, and solid core evidence (brand + model, weight >= 50).
    if (score >= 0.80 && modelRequirementMet && matchedWeight >= 50) {
      return {
        confidence: "HIGH_CONFIDENCE",
        score,
        signals,
        hardContradiction: false,
        reasons: ["Strong product identity match"],
      };
    }

    // POSSIBLE
    if (score >= 0.55 && matchedWeight >= 20) {
      return {
        confidence: "POSSIBLE",
        score,
        signals,
        hardContradiction: false,
        reasons: ["Potential product match requires further verification"],
      };
    }

    return {
      confidence: "REJECTED",
      score,
      signals,
      hardContradiction: false,
      reasons: ["Insufficient identity similarity"],
    };
  }
}

