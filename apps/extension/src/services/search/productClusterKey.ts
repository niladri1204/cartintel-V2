import type {
  IdentityCandidate,
} from "./identityTypes";

import {
  normalizeIdentityValue,
  normalizeCapacity,
} from "./identityNormalizer";

function value(
  input: string | null | undefined
): string {
  return normalizeIdentityValue(input);
}

function capacity(
  input: string | null | undefined
): string {
  return normalizeCapacity(input);
}

export function createProductClusterKey(
  product: IdentityCandidate
): string {
  return [
    value(product.brand),
    value(product.model),
    value(product.variant),
    value(product.productType),
    capacity(product.storage),
    capacity(product.ram),
    value(product.color),
    value(product.size),
  ]
    .filter(Boolean)
    .join("|");
}
