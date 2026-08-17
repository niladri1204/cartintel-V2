import type {
  RawProductResult,
} from "./types";

import type {
  IdentityCandidate,
} from "./identityTypes";

import { processProduct } from "../../intelligence/engine";

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
  // Use existing Intelligence engine as fallback when product attributes/fields are missing
  const intel = processProduct({
    title: product.title,
    price: product.price ?? null,
    currency: product.currency ?? null,
    image: product.imageUrl ?? product.image ?? null,
    url: product.url,
  });

  const attrVariant = getStringAttribute(product.attributes, 'variant');
  const attrCategory = getStringAttribute(product.attributes, 'category');
  const attrProductType = getStringAttribute(product.attributes, 'productType');
  const attrColor = getStringAttribute(product.attributes, 'color');
  const attrSize = getStringAttribute(product.attributes, 'size');
  const attrStorage = getStringAttribute(product.attributes, 'storage');
  const attrRam = getStringAttribute(product.attributes, 'ram');
  const attrFingerprint = getStringAttribute(product.attributes, 'fingerprint');

  return {
    title: product.title,

    brand: product.brand ?? intel.brand,
    model: product.model ?? intel.model,
    variant: attrVariant ?? intel.variant,

    category: attrCategory ?? intel.category,
    productType: attrProductType ?? intel.productType,
    color: attrColor ?? intel.color,
    size: attrSize ?? intel.size,
    storage: attrStorage ?? intel.storage,
    ram: attrRam ?? intel.ram,
    fingerprint: attrFingerprint ?? intel.fingerprint,

    identifiers: product.identifiers,
    attributes: product.attributes,

    googleProductId: product.googleProductId ?? null,
    googleImmersiveToken: product.googleImmersiveToken ?? null,
    googleShoppingProductLink: product.googleShoppingProductLink ?? null,
    marketplaceLogo: product.marketplaceLogo ?? null,
    searchQuery: product.searchQuery,
    searchRank: product.searchRank,
    rating: product.rating ?? null,
    deliveryInfo: product.deliveryInfo ?? null,
  };
}


