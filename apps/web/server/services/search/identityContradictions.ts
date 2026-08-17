import type {
  IdentityCandidate,
} from "./identityTypes";

import {
  normalizeIdentityValue,
  normalizeCapacity,
} from "./identityNormalizer";

function different(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;

  return (
    normalizeIdentityValue(a) !==
    normalizeIdentityValue(b)
  );
}

function differentCapacity(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;

  return (
    normalizeCapacity(a) !==
    normalizeCapacity(b)
  );
}

export function findHardContradictions(
  source: IdentityCandidate,
  candidate: IdentityCandidate
): string[] {
  const contradictions: string[] = [];

  // Brand contradiction
  if (different(source.brand, candidate.brand)) {
    contradictions.push("brand");
  }

  // Model contradiction
  if (different(source.model, candidate.model)) {
    contradictions.push("model");
  }

  // Storage contradiction
  if (
    differentCapacity(
      source.storage,
      candidate.storage
    )
  ) {
    contradictions.push("storage");
  }

  // RAM contradiction
  if (
    differentCapacity(
      source.ram,
      candidate.ram
    )
  ) {
    contradictions.push("ram");
  }

  // Color contradiction
  if (different(source.color, candidate.color)) {
    contradictions.push("color");
  }

  // Size contradiction
  if (different(source.size, candidate.size)) {
    contradictions.push("size");
  }

  return contradictions;
}
