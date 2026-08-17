import type { ProductIntelligence } from "./types";
import { compareProducts } from "./matching";

export interface ProductCluster {
  clusterId: string;
  confidence: number;
  reason: string;
  products: ProductIntelligence[];
  productCount: number;
  marketplaceCount: number;
  marketplaces: string[];
}

function addProductToCluster(cluster: ProductCluster, product: ProductIntelligence) {
  cluster.products.push(product);
  cluster.productCount = cluster.products.length;
  if (!cluster.marketplaces.includes(product.metadata.marketplace)) {
    cluster.marketplaces.push(product.metadata.marketplace);
  }
  cluster.marketplaceCount = cluster.marketplaces.length;
}

/**
 * Phase 1.9.4.3 - Exact Variant Product Resolver
 * Clusters products representing the SAME exact variant while ensuring
 * explicitly conflicting variants (storage, RAM, color, generic variant,
 * productType, category, brand, model) remain in separate clusters.
 *
 * 1. Fingerprint-first lookup for identical identities.
 * 2. Fallback to compareProducts() compatibility check against cluster representative
 *    for non-identical fingerprints.
 */
export function resolveProducts(
  products: ProductIntelligence[]
): ProductCluster[] {
  const map = new Map<string, ProductCluster>();
  let accepted = 0;
  let rejected = 0;

  for (const product of products) {
    const fingerprint = product.fingerprint;
    const existing = map.get(fingerprint);

    if (existing) {
      addProductToCluster(existing, product);
      if (existing.reason === "Single Product" || 100 > existing.confidence) {
        existing.confidence = 100;
        existing.reason = "Fingerprint Match";
      }
    } else {
      let foundMatch = false;
      
      for (const cluster of map.values()) {
        const representative = cluster.products[0];
        const matchResult = compareProducts(product, representative);
        
        if (matchResult.isMatch) {
          addProductToCluster(cluster, product);
          if (cluster.reason === "Single Product" || matchResult.confidence > cluster.confidence) {
            cluster.confidence = matchResult.confidence;
            cluster.reason = matchResult.decision;
          }
          foundMatch = true;
          accepted++;
          break;
        } else {
          rejected++;
        }
      }

      if (!foundMatch) {
        const newCluster: ProductCluster = {
          clusterId: fingerprint,
          confidence: 0,
          reason: "Single Product",
          products: [],
          productCount: 0,
          marketplaceCount: 0,
          marketplaces: []
        };
        addProductToCluster(newCluster, product);
        map.set(fingerprint, newCluster);
      }
    }
  }

  console.log(`[Diagnostic 7] Number accepted as matches: ${accepted}`);
  console.log(`[Diagnostic 8] Number rejected as non-matches: ${rejected}`);
  console.log(`[Diagnostic 9] Number of clusters created: ${map.size}`);

  return Array.from(map.values());
}

export interface ProductIdentity {
  id: string;
  representative: ProductIntelligence;
  products: ProductIntelligence[];
  confidence: number;
  reason: string;
  marketplaces: string[];
  productCount: number;
}

export function buildProductIdentities(
  clusters: ProductCluster[]
): ProductIdentity[] {
  return clusters.map(cluster => ({
    id: cluster.clusterId,
    representative: cluster.products[0],
    products: cluster.products,
    confidence: cluster.confidence,
    reason: cluster.reason,
    marketplaces: cluster.marketplaces,
    productCount: cluster.productCount
  }));
}
