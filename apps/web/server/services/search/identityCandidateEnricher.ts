import type { RawProductResult } from "./types";
import type { IdentityCandidate } from "./identityTypes";
import { parseProductTitle } from "../../../../extension/src/intelligence/parser";
import { generateFingerprint } from "../../../../extension/src/intelligence/fingerprint";
import { toIdentityCandidate } from "./identityCandidateAdapter";

export interface EnrichedIdentityCandidate {
  raw: RawProductResult;
  candidate: IdentityCandidate;
  extractionSignals: {
    titleParsed: boolean;
  };
}

export function enrichIdentityCandidate(raw: RawProductResult): EnrichedIdentityCandidate {
  // 1. Basic conversion from adapter (preserves provider-supplied data)
  const baseCandidate = toIdentityCandidate(raw);

  // 2. Extract from title
  const parsed = parseProductTitle(raw.title);

  // 3. Provider-supplied data takes precedence. If null, use parsed data.
  const brand = baseCandidate.brand ?? parsed.brand;
  const model = baseCandidate.model ?? parsed.model;
  const variant = baseCandidate.variant ?? parsed.variant;
  const category = baseCandidate.category ?? parsed.category;
  const productType = baseCandidate.productType ?? parsed.productType;
  const color = baseCandidate.color ?? parsed.color;
  const size = baseCandidate.size ?? parsed.size;
  const storage = baseCandidate.storage ?? parsed.storage;
  const ram = baseCandidate.ram ?? parsed.ram;

  // Rebuild attributes to merge provider + parsed
  const attributes = { ...baseCandidate.attributes };
  if (storage && !attributes.storage) attributes.storage = storage;
  if (ram && !attributes.ram) attributes.ram = ram;
  if (color && !attributes.color) attributes.color = color;
  if (size && !attributes.size) attributes.size = size;

  // Fingerprint
  const fingerprint = baseCandidate.fingerprint ?? generateFingerprint(brand, model, storage, ram, variant, color);

  const candidate: IdentityCandidate = {
    ...baseCandidate,
    brand,
    model,
    variant,
    category,
    productType,
    color,
    size,
    storage,
    ram,
    fingerprint,
    attributes,
  };

  return {
    raw,
    candidate,
    extractionSignals: {
      titleParsed: true,
    }
  };
}
