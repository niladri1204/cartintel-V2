import type {
  RawProductResult,
} from "./types";

import type {
  IdentityCandidate,
} from "./identityTypes";

function getStringAttribute(
  attributes: Record<string, string | number | boolean | null> | undefined,
  key: string
): string | null {
  const val = attributes?.[key];
  return typeof val === 'string' ? val : null;
}

export function toIdentityCandidate(
  product: RawProductResult
): IdentityCandidate {
  return {
    title: product.title,

    brand: product.brand ?? null,
    model: product.model ?? null,
    variant: getStringAttribute(product.attributes, 'variant'),

    category: getStringAttribute(product.attributes, 'category'),
    productType: getStringAttribute(product.attributes, 'productType'),
    color: getStringAttribute(product.attributes, 'color'),
    size: getStringAttribute(product.attributes, 'size'),
    storage: getStringAttribute(product.attributes, 'storage'),
    ram: getStringAttribute(product.attributes, 'ram'),
    fingerprint: getStringAttribute(product.attributes, 'fingerprint'),

    identifiers:
      product.identifiers,

    attributes:
      product.attributes,
  };
}
