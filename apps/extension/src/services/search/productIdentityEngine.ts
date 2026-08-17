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
): IdentitySignal {
  const sourceValue =
    normalizeIdentityValue(source);

  const candidateValue =
    normalizeIdentityValue(candidate);

  const matched =
    Boolean(sourceValue) &&
    Boolean(candidateValue) &&
    sourceValue === candidateValue;

  return {
    field,
    sourceValue: source ?? null,
    candidateValue: candidate ?? null,
    matched,
    weight,
  };
}

export class ProductIdentityEngine {
  compare(
    source: IdentityCandidate,
    candidate: IdentityCandidate
  ): IdentityComparison {
    const signals: IdentitySignal[] = [];

    signals.push(
      compareField(
        "brand",
        source.brand,
        candidate.brand,
        20
      )
    );

    signals.push(
      compareField(
        "model",
        source.model,
        candidate.model,
        30
      )
    );

    signals.push(
      compareField(
        "variant",
        source.variant,
        candidate.variant,
        15
      )
    );

    signals.push(
      compareField(
        "category",
        source.category,
        candidate.category,
        10
      )
    );

    signals.push(
      compareField(
        "productType",
        source.productType,
        candidate.productType,
        10
      )
    );

    signals.push(
      compareField(
        "color",
        source.color,
        candidate.color,
        5
      )
    );

    signals.push(
      compareField(
        "size",
        source.size,
        candidate.size,
        5
      )
    );

    signals.push(
      compareField(
        "storage",
        source.storage,
        candidate.storage,
        10
      )
    );

    signals.push(
      compareField(
        "ram",
        source.ram,
        candidate.ram,
        10
      )
    );

    const contradictions =
      findHardContradictions(
        source,
        candidate
      );

    const totalWeight =
      signals.reduce(
        (sum, signal) =>
          sum + signal.weight,
        0
      );

    const matchedWeight =
      signals
        .filter(signal => signal.matched)
        .reduce(
          (sum, signal) =>
            sum + signal.weight,
          0
        );

    const score =
      totalWeight === 0
        ? 0
        : matchedWeight / totalWeight;

    // HARD REJECTION
    if (contradictions.length > 0) {
      return {
        confidence: "REJECTED",
        score,
        signals,
        hardContradiction: true,
        reasons: contradictions.map(
          field =>
            `Conflicting ${field}`
        ),
      };
    }

    // EXACT
    if (score >= 0.95) {
      return {
        confidence: "EXACT",
        score,
        signals,
        hardContradiction: false,
        reasons: [
          "All critical identity signals agree",
        ],
      };
    }

    // HIGH CONFIDENCE
    if (score >= 0.80) {
      return {
        confidence: "HIGH_CONFIDENCE",
        score,
        signals,
        hardContradiction: false,
        reasons: [
          "Strong product identity match",
        ],
      };
    }

    // POSSIBLE
    if (score >= 0.55) {
      return {
        confidence: "POSSIBLE",
        score,
        signals,
        hardContradiction: false,
        reasons: [
          "Potential product match requires further verification",
        ],
      };
    }

    return {
      confidence: "REJECTED",
      score,
      signals,
      hardContradiction: false,
      reasons: [
        "Insufficient identity similarity",
      ],
    };
  }
}
