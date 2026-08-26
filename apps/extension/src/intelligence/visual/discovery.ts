import type { ImageInput, VisualProductRecognitionResult } from "./types";
import {
  type VisualSearchAttributes,
  convertToSearchAttributes,
  enhanceSearchQueryInput
} from "./searchAttributes";
import {
  type VisualIdentityReconciliation,
  reconcileVisualIdentity
} from "./visualIdentityReconciliation";
import { extractPageImages } from "./pageImages";
import { VisualProductRecognitionService } from "./service";
import type { ProductIntelligence } from "../types";
import type {
  RecommendationRequest,
  RecommendationResult,
  RecommendationCandidate
} from "../recommendationTypes";
import {
  type ProductIdentity,
  resolveProducts,
  buildProductIdentities
} from "../resolver";
import { matchCandidates } from "../integration";
import { buildExplainableRecommendation } from "../decision/decisionExplanation";
import { DiscoveryEngine } from "../../services/search/discoveryEngine";
import { CartIntelDiscoveryProvider } from "../../services/search/CartIntelDiscoveryProvider";
import type { SearchQueryInput } from "../../services/search/queryGenerator";
import { processSearchResults } from "../../services/search/mapper";

export interface VisualDiscoveryRequest {
  image: ImageInput;
  visualRecognitionResult?: VisualProductRecognitionResult | null;
  visualSearchAttributes?: VisualSearchAttributes | null;
  userRequirements?: RecommendationRequest | null;
  existingProductContext?: ProductIntelligence | null;
}

export type VisualDiscoveryMatchStatus =
  | "exact_match"
  | "likely_match"
  | "possible_match"
  | "no_reliable_match";

export interface VisualDiscoveryResult {
  status: "success" | "partial_success" | "no_results" | "failed" | "unavailable";
  recognition: VisualProductRecognitionResult | null;
  searchAttributes: VisualSearchAttributes | null;
  reconciliation?: VisualIdentityReconciliation | null;
  generatedQueries: string[];
  discoveredCandidates: ProductIntelligence[];
  matchStatus: VisualDiscoveryMatchStatus;
  matchedProducts: ProductIntelligence[];
  similarProducts: ProductIdentity[];
  alternativeProducts: RecommendationCandidate[];
  recommendationResult?: RecommendationResult | null;
  message?: string;
}

export async function discoverProductsFromImage(
  request: VisualDiscoveryRequest,
  options?: {
    recognitionService?: VisualProductRecognitionService;
    discoveryEngine?: DiscoveryEngine;
    providerId?: string;
  }
): Promise<VisualDiscoveryResult> {
  // Maintain immutability: deep copy input parameters to avoid modifying calling objects
  const requestCopy = JSON.parse(JSON.stringify(request)) as VisualDiscoveryRequest;

  // 1. Resolve recognition result
  let recognition = requestCopy.visualRecognitionResult || null;
  const recognitionService =
    options?.recognitionService || new VisualProductRecognitionService();

  if (!recognition) {
    try {
      recognition = await recognitionService.recognizeProductFromImage(
        requestCopy.image,
        {
          providerId: options?.providerId
        }
      );
    } catch (error) {
      return {
        status: "failed",
        recognition: null,
        searchAttributes: null,
        generatedQueries: [],
        discoveredCandidates: [],
        matchStatus: "no_reliable_match",
        matchedProducts: [],
        similarProducts: [],
        alternativeProducts: [],
        message: `Recognition service threw an error: ${
          error instanceof Error ? error.message : String(error)
        }`
      };
    }
  }

  // Handle provider unavailable / recognition failure safety
  if (recognition.status === "unavailable") {
    return {
      status: "unavailable",
      recognition,
      searchAttributes: null,
      reconciliation: null,
      generatedQueries: [],
      discoveredCandidates: [],
      matchStatus: "no_reliable_match",
      matchedProducts: [],
      similarProducts: [],
      alternativeProducts: [],
      message: "Visual recognition provider is unavailable or not configured."
    };
  }

  // 2. Resolve search attributes
  let searchAttributes = requestCopy.visualSearchAttributes || null;
  if (!searchAttributes && recognition) {
    searchAttributes = convertToSearchAttributes(
      recognition,
      requestCopy.image.metadata
    );
  }

  if (!searchAttributes || searchAttributes.searchTerms.length === 0) {
    // Recognition was uncertain/unknown and produced no search signals
    return {
      status: "no_results",
      recognition,
      searchAttributes,
      reconciliation: null,
      generatedQueries: [],
      discoveredCandidates: [],
      matchStatus: "no_reliable_match",
      matchedProducts: [],
      similarProducts: [],
      alternativeProducts: [],
      message: "Visual search attributes are empty or recognition is too uncertain."
    };
  }

  // 2.1 Reconcile identity if page context exists
  let reconciliation: VisualIdentityReconciliation | null = null;
  if (recognition && requestCopy.existingProductContext && searchAttributes) {
    reconciliation = reconcileVisualIdentity(recognition, {
      brand: requestCopy.existingProductContext.brand,
      model: requestCopy.existingProductContext.model,
      title: requestCopy.existingProductContext.normalizedTitle || requestCopy.existingProductContext.originalTitle,
      category: requestCopy.existingProductContext.category
    });

    if (reconciliation.status === "conflicting") {
      // Sanitize searchAttributes to protect from conflicting brand/model
      searchAttributes.brand = reconciliation.resolvedBrand;
      searchAttributes.model = reconciliation.resolvedModel;

      // Rebuild searchTerms to use resolved brand/model and avoid poisoning
      const newSearchTerms: string[] = [];
      if (reconciliation.resolvedBrand) {
        newSearchTerms.push(reconciliation.resolvedBrand);
      }
      if (reconciliation.resolvedModel) {
        const normModel = reconciliation.resolvedModel;
        const normBrand = reconciliation.resolvedBrand;
        if (normBrand && normModel.toLowerCase().startsWith(normBrand.toLowerCase())) {
          newSearchTerms.length = 0;
        }
        newSearchTerms.push(normModel);
      }
      if (searchAttributes.color) {
        newSearchTerms.push(searchAttributes.color);
      }
      searchAttributes.searchTerms = newSearchTerms;
    }
  }

  // 3. Integrate existing product context
  const queryBrand = searchAttributes.brand || (reconciliation ? reconciliation.resolvedBrand : (requestCopy.existingProductContext?.brand || null));
  const queryModel = searchAttributes.model || (reconciliation ? reconciliation.resolvedModel : (requestCopy.existingProductContext?.model || null));
  const queryCategory = searchAttributes.category || (reconciliation ? reconciliation.resolvedCategory : (requestCopy.existingProductContext?.category || null));

  // 4. Generate query cascade & enhance search query input
  const baseQueryInput: SearchQueryInput = {
    title: "",
    brand: queryBrand,
    model: queryModel,
    category: queryCategory,
    attributes: {
      color: searchAttributes.color,
      formFactor: searchAttributes.formFactor,
      material: searchAttributes.material
    }
  };

  const enhancedQueryInput = enhanceSearchQueryInput(
    searchAttributes,
    baseQueryInput
  );
  console.log("[VisualTrace] visual search query:", enhancedQueryInput.title);

  // 5. Discover candidates via existing DiscoveryEngine
  const engine =
    options?.discoveryEngine ||
    new DiscoveryEngine(new CartIntelDiscoveryProvider());

  let discoveryResult;
  try {
    discoveryResult = await engine.discover(enhancedQueryInput);
    console.log("[VisualTrace] discovery candidates:", discoveryResult?.candidates?.length || 0);
  } catch (error) {
    return {
      status: "failed",
      recognition,
      searchAttributes,
      generatedQueries: [enhancedQueryInput.title],
      discoveredCandidates: [],
      matchStatus: "no_reliable_match",
      matchedProducts: [],
      similarProducts: [],
      alternativeProducts: [],
      message: `DiscoveryEngine failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    };
  }

  const generatedQueries = discoveryResult.queries.map((q) =>
    typeof q.query === "string" ? q.query : q.query?.query || ""
  );
  const rawResults = discoveryResult.candidates || [];

  // If no candidates are found, exit safely without crashing
  if (rawResults.length === 0) {
    return {
      status: "no_results",
      recognition,
      searchAttributes,
      reconciliation,
      generatedQueries,
      discoveredCandidates: [],
      matchStatus: "no_reliable_match",
      matchedProducts: [],
      similarProducts: [],
      alternativeProducts: [],
      message: "DiscoveryEngine returned no matching candidates."
    };
  }

  // 6. Map raw results into ProductIntelligence using the existing mapper
  const discoveredCandidates = processSearchResults(rawResults);

  // 7. Perform exact / likely matching & similar products separation
  // Construct a virtual "reference product" representing our target product
  const effectiveBrand =
    reconciliation?.resolvedBrand ||
    requestCopy.existingProductContext?.brand ||
    searchAttributes.brand ||
    null;
  const effectiveModel =
    reconciliation?.resolvedModel ||
    requestCopy.existingProductContext?.model ||
    searchAttributes.model ||
    null;
  const effectiveCategory =
    reconciliation?.resolvedCategory ||
    requestCopy.existingProductContext?.category ||
    searchAttributes.category ||
    null;

  const referenceProduct: ProductIntelligence = {
    originalTitle: effectiveModel
      ? `${effectiveBrand || ""} ${effectiveModel}`
      : requestCopy.existingProductContext?.originalTitle ||
        searchAttributes.productType ||
        "Photographed Product",
    originalPrice: requestCopy.existingProductContext?.originalPrice || null,
    originalCurrency: requestCopy.existingProductContext?.originalCurrency || null,
    brand: effectiveBrand,
    model: effectiveModel,
    category: effectiveCategory,
    productType:
      requestCopy.existingProductContext?.productType ||
      searchAttributes.productType ||
      null,
    color:
      requestCopy.existingProductContext?.color ||
      searchAttributes.color ||
      null,
    normalizedTitle: (effectiveModel
      ? `${effectiveBrand || ""} ${effectiveModel}`
      : requestCopy.existingProductContext?.normalizedTitle ||
        searchAttributes.productType ||
        "Photographed Product"
    ).toLowerCase(),
    confidence:
      requestCopy.existingProductContext?.confidence ||
      searchAttributes.confidence ||
      0,
    fingerprint:
      requestCopy.existingProductContext?.fingerprint ||
      `${effectiveBrand || "unknown"}|${effectiveModel || "unknown"}`,
    metadata: {
      marketplace: "Camera",
      hostname: "camera.local",
      detectedAt: Date.now()
    }
  };

  // Cluster reference product with candidates using matchCandidates()
  const primaryIdentity = matchCandidates(
    referenceProduct,
    discoveredCandidates
  );

  // The candidates matching the primary cluster represent exact/likely matched products
  const matchedProducts = primaryIdentity.products.filter(
    (p) => p !== referenceProduct
  );

  // Determine match status
  let matchStatus: VisualDiscoveryMatchStatus = "no_reliable_match";
  if (matchedProducts.length > 0) {
    const confidenceScore = primaryIdentity.confidence;
    if (confidenceScore >= 90) {
      matchStatus = "exact_match";
    } else if (confidenceScore >= 75) {
      matchStatus = "likely_match";
    } else {
      matchStatus = "possible_match";
    }
  }

  // Cluster ALL discovered candidates together with reference product to isolate similar products
  const allProductsForClustering = [referenceProduct, ...discoveredCandidates];
  const allClusters = resolveProducts(allProductsForClustering);
  const allIdentities = buildProductIdentities(allClusters);

  // Similar products must remain in distinct canonical clusters (i.e. different fingerprint identities)
  const resolvedPrimary = allIdentities.find(
    (id) =>
      id.representative === referenceProduct ||
      id.products.includes(referenceProduct)
  );
  const similarProducts = allIdentities.filter((id) => id !== resolvedPrimary);

  // 8. Re-use existing Phase 1/2 alternatives logic & requirements evaluation
  // Map discovered candidates to RecommendationCandidate contract
  const recCandidates: RecommendationCandidate[] = discoveredCandidates.map(
    (c) => {
      return {
        product: c,
        isCurrentProduct: false,
        isRefurbishedOrUsed:
          c.normalizedTitle?.includes("refurbished") ||
          c.normalizedTitle?.includes("used") ||
          false,
        isUnavailable: false,
        currencyMismatch: false,
        marketplaceReliabilityScore: 80,
        qualityScore: 80,
        priceAvailabilityScore: 80,
        finalRankingScore: 80,
        identityConfidenceScore: c.confidence || 80
      };
    }
  );

  const recRequest: RecommendationRequest = requestCopy.userRequirements || {
    candidates: recCandidates
  };

  if (!recRequest.candidates) {
    recRequest.candidates = recCandidates;
  }

  // Call the existing buildExplainableRecommendation engine
  let recommendationResult: RecommendationResult | null = null;
  let alternativeProducts: RecommendationCandidate[] = [];

  try {
    recommendationResult = buildExplainableRecommendation(
      recRequest,
      recCandidates
    );
    if (
      recommendationResult &&
      Array.isArray(recommendationResult.alternatives)
    ) {
      alternativeProducts = recommendationResult.alternatives.map(
        (alt) => alt.candidate
      );
    }
  } catch (recError) {
    console.error(
      "buildExplainableRecommendation failed inside visual discovery:",
      recError
    );
  }

  return {
    status: matchedProducts.length > 0 ? "success" : "partial_success",
    recognition,
    searchAttributes,
    reconciliation,
    generatedQueries,
    discoveredCandidates,
    matchStatus,
    matchedProducts,
    similarProducts,
    alternativeProducts,
    recommendationResult
  };
}

/**
 * Automatically extracts, ranks, and analyzes up to 3 relevant product images from the active webpage DOM.
 */
export async function discoverProductsFromPage(
  doc: any,
  options?: {
    recognitionService?: VisualProductRecognitionService;
    discoveryEngine?: DiscoveryEngine;
    providerId?: string;
    userRequirements?: RecommendationRequest | null;
    existingProductContext?: ProductIntelligence | null;
  }
): Promise<VisualDiscoveryResult> {
  console.log("[Visual] discoverProductsFromPage called");

  // 1. Extract up to 3 relevant page images
  const pageImages = extractPageImages(doc, 3);
  console.log("[Visual] images extracted:", pageImages.length);

  if (pageImages.length === 0) {
    return {
      status: "no_results",
      recognition: null,
      searchAttributes: null,
      generatedQueries: [],
      discoveredCandidates: [],
      matchStatus: "no_reliable_match",
      matchedProducts: [],
      similarProducts: [],
      alternativeProducts: [],
      message: "No relevant product images found on the page."
    };
  }

  const recognitionService =
    options?.recognitionService || new VisualProductRecognitionService();

  // 2. Prepare batch images
  const imageInputList = pageImages.map((pageImg) => ({
    url: pageImg.url,
    metadata: { type: "product_image" as const, alt: pageImg.alt || "" }
  }));
  console.log("[Visual] selected images:", imageInputList.length);

  const batchImageInput: ImageInput = {
    url: imageInputList[0].url,
    images: imageInputList,
    metadata: { type: "product_image" as const, alt: imageInputList[0].metadata?.alt || "" }
  };

  // 3. Perform batch recognition call
  let recognition: VisualProductRecognitionResult;
  try {
    console.log("[Visual] recognition service invoked");
    recognition = await recognitionService.recognizeProductFromImage(
      batchImageInput,
      { providerId: options?.providerId }
    );
  } catch (error) {
    return {
      status: "failed",
      recognition: null,
      searchAttributes: null,
      reconciliation: null,
      generatedQueries: [],
      discoveredCandidates: [],
      matchStatus: "no_reliable_match",
      matchedProducts: [],
      similarProducts: [],
      alternativeProducts: [],
      message: `Recognition failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }

  if (recognition.status === "unavailable") {
    return {
      status: "unavailable",
      recognition,
      searchAttributes: null,
      reconciliation: null,
      generatedQueries: [],
      discoveredCandidates: [],
      matchStatus: "no_reliable_match",
      matchedProducts: [],
      similarProducts: [],
      alternativeProducts: [],
      message: "Visual recognition provider is unavailable or not configured."
    };
  }

  // 4. Construct VisualDiscoveryRequest and delegate to discoverProductsFromImage
  const request: VisualDiscoveryRequest = {
    image: batchImageInput,
    visualRecognitionResult: recognition,
    userRequirements: options?.userRequirements,
    existingProductContext: options?.existingProductContext
  };

  const result = await discoverProductsFromImage(request, options);
  console.log("[VisualTrace] discoverProductsFromPage result:", result.status, result.matchStatus, result.matchedProducts.length);
  return result;
}
