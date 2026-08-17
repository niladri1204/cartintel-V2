import type {
  CanonicalProduct,
  ProductOffer,
} from "./clusterTypes";

import type {
  IdentityCandidate,
} from "./identityTypes";

import {
  ProductIdentityEngine,
} from "./productIdentityEngine";

import {
  createProductClusterKey,
} from "./productClusterKey";

export interface ClusterCandidate
  extends IdentityCandidate {
  id: string;

  title: string;

  source: string;

  seller?: string | null;

  price?: number | null;

  currency?: string | null;

  url: string;

  imageUrl?: string | null;

  availability?: string | null;
}

export class ProductClusterer {
  private readonly identityEngine: ProductIdentityEngine;

  constructor(
    identityEngine: ProductIdentityEngine
  ) {
    this.identityEngine = identityEngine;
  }

  cluster(
    candidates: ClusterCandidate[]
  ): CanonicalProduct[] {
    const clusters: CanonicalProduct[] = [];

    for (const candidate of candidates) {
      const existing =
        this.findMatchingCluster(
          candidate,
          clusters
        );

      if (!existing) {
        clusters.push(
          this.createCluster(candidate)
        );

        continue;
      }

      existing.offers.push(
        this.createOffer(
          candidate,
          "EXACT",
          1
        )
      );
    }

    return clusters;
  }

  private findMatchingCluster(
    candidate: ClusterCandidate,
    clusters: CanonicalProduct[]
  ): CanonicalProduct | null {
    const candidateKey =
      createProductClusterKey(candidate);

    for (const cluster of clusters) {
      const clusterCandidate: IdentityCandidate = {
        title: cluster.title,
        brand: cluster.brand,
        model: cluster.model,
        variant: cluster.variant,
        category: cluster.category,
        productType: cluster.productType,
        color: cluster.color,
        size: cluster.size,
        storage: cluster.storage,
        ram: cluster.ram,
        fingerprint: cluster.fingerprint,
      };

      const clusterKey =
        createProductClusterKey(
          clusterCandidate
        );

      if (candidateKey === clusterKey) {
        return cluster;
      }

      const comparison =
        this.identityEngine.compare(
          clusterCandidate,
          candidate
        );

      if (
        comparison.confidence ===
          "EXACT" ||
        comparison.confidence ===
          "HIGH_CONFIDENCE"
      ) {
        return cluster;
      }
    }

    return null;
  }

  private createCluster(
    candidate: ClusterCandidate
  ): CanonicalProduct {
    return {
      id: `cluster_${candidate.id}`,

      title: candidate.title,

      brand: candidate.brand ?? null,
      model: candidate.model ?? null,
      variant: candidate.variant ?? null,

      category: candidate.category ?? null,
      productType:
        candidate.productType ?? null,

      color: candidate.color ?? null,
      size: candidate.size ?? null,

      storage: candidate.storage ?? null,
      ram: candidate.ram ?? null,

      fingerprint:
        candidate.fingerprint ?? null,

      googleProductId: candidate.googleProductId ?? null,

      offers: [
        this.createOffer(
          candidate,
          "EXACT",
          1
        ),
      ],
    };
  }

  private createOffer(
    candidate: ClusterCandidate,
    confidence:
      | "EXACT"
      | "HIGH_CONFIDENCE"
      | "POSSIBLE",
    score: number
  ): ProductOffer {
    return {
      id: candidate.id,

      source: candidate.source,
      seller: candidate.seller ?? null,

      title: candidate.title,

      price: candidate.price ?? null,
      currency:
        candidate.currency ?? null,

      url: candidate.url,

      imageUrl:
        candidate.imageUrl ?? null,

      availability:
        candidate.availability ?? null,

      identity: {
        confidence,
        score,
      },

      googleProductId: candidate.googleProductId ?? null,
      googleImmersiveToken: candidate.googleImmersiveToken ?? null,
      googleShoppingProductLink: candidate.googleShoppingProductLink ?? null,
      marketplaceLogo: candidate.marketplaceLogo ?? null,
      searchQuery: candidate.searchQuery,
      searchRank: candidate.searchRank,
      identifiers: candidate.identifiers,
      rating: candidate.rating ?? null,
      deliveryInfo: candidate.deliveryInfo ?? null,
    };
  }


}
