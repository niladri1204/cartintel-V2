import type { ProductIntelligence } from "./types";
import { resolveProducts, buildProductIdentities } from "./resolver";
import type { ProductIdentity } from "./resolver";
import { compareProducts } from "./matching";

/**
 * Adapter to identify which external candidate products actually belong to the CURRENT product's cluster.
 * Independently validates every candidate directly against currentProduct before passing accepted candidates to resolveProducts().
 */
export function matchCandidates(
  currentProduct: ProductIntelligence,
  candidates: ProductIntelligence[]
): ProductIdentity {
  
  if (!currentProduct) {
    throw new Error("CartIntel Integration: currentProduct is required.");
  }

  const rawCandidates = candidates || [];
  console.log(`[Diagnostic 6] Number reaching matching engine: ${rawCandidates.length}`);

  let acceptedCount = 0;
  let rejectedCount = 0;

  // Direct validation against currentProduct to prevent transitive clustering
  const validatedCandidates: ProductIntelligence[] = [];
  for (const candidate of rawCandidates) {
    const matchResult = compareProducts(currentProduct, candidate);
    if (matchResult.isMatch) {
      validatedCandidates.push(candidate);
      acceptedCount++;
    } else {
      rejectedCount++;
    }
  }

  console.log(`[Diagnostic Direct Validation] Accepted: ${acceptedCount}, Rejected: ${rejectedCount}`);

  // Combine reference product with directly validated candidates only
  const allProducts = [currentProduct, ...validatedCandidates];

  // Resolve into clusters using the single source of truth
  const clusters = resolveProducts(allProducts);

  // Convert to identities
  const identities = buildProductIdentities(clusters);

  // Identify the primary cluster by strictly checking object reference equality 
  // on the representative product. The resolver preserves the original objects.
  const primaryIdentity = identities.find(
    (identity) => identity.representative === currentProduct
  );

  if (!primaryIdentity) {
    // This should theoretically never happen unless the resolver mutates or drops objects
    throw new Error("CartIntel Integration: Critical failure. The current product was lost during resolver clustering.");
  }

  return primaryIdentity;
}
