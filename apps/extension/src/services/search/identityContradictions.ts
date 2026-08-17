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

const ACCESSORY_REGEX =
  /\b(?:case|cover|screen\s*protector|tempered\s*glass|protective\s*glass|screen\s*guard|phone\s*cover|mobile\s*cover|back\s*cover|bumper\s*case|charger|charging\s*cable|charging\s*adapter|adapter|cable|replacement\s*battery|battery\s*replacement|replacement\s*screen|replacement\s*display|lens\s*protector|camera\s*protector|keyboard\s*cover|laptop\s*sleeve)\b/i;

const BUNDLE_REGEX =
  /\b(?:combo|bundle|kit|pack\s+with|with\s+case|with\s+charger|with\s+cover|with\s+screen\s+protector)\b|\+\s*(?:case|charger|cover|screen\s*protector)\b/i;

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

  // Accessory contradiction
  const sourceIsAccessory = ACCESSORY_REGEX.test(source.title || "");
  const candidateIsAccessory = ACCESSORY_REGEX.test(candidate.title || "");
  if (sourceIsAccessory !== candidateIsAccessory) {
    contradictions.push("accessory");
  }

  // Bundle contradiction
  const sourceIsBundle = BUNDLE_REGEX.test(source.title || "");
  const candidateIsBundle = BUNDLE_REGEX.test(candidate.title || "");
  if (sourceIsBundle !== candidateIsBundle) {
    contradictions.push("bundle");
  }

  return contradictions;
}

