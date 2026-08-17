import { useEffect, useState } from "react";
import { Globe, Sparkles, Settings, Info, ShoppingBag, ExternalLink, RefreshCw, Store } from "lucide-react";
import type { ProductDetectionResult } from "../content/types";
import type { ProductIntelligence } from "../intelligence/types";
import { compareProduct, type ComparisonResult } from "../intelligence/orchestrator";
import { rankDeals, type RankedDealResult } from "../intelligence/ranking";
import { recommendDeal, type RecommendationResult } from "../intelligence/recommendation";
import { buildRecommendationRequest } from "../intelligence/intent/recommendationRequestBuilder";
import { buildExplainableRecommendation } from "../intelligence/decision/decisionExplanation";
import type { RecommendationCandidate, RecommendationResult as DecisionRecommendationResult } from "../intelligence/recommendationTypes";
import { RecommendationPresentation } from "./components/RecommendationPresentation";

export default function Popup() {
  const [product, setProduct] = useState<ProductDetectionResult | null>(null);
  const [intelligence, setIntelligence] = useState<ProductIntelligence | null>(null);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [rankedDeals, setRankedDeals] = useState<RankedDealResult | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [decisionRecommendation, setDecisionRecommendation] = useState<DecisionRecommendationResult | null>(null);

  const [activeTabUrl, setActiveTabUrl] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const normalizeUrl = (u?: string | null) => {
    if (!u) return '';
    try {
      const p = new URL(u);
      return p.origin + p.pathname + p.search;
    } catch {
      return u;
    }
  };

  const loadStorageAndValidate = (currentActiveUrl: string, tabId?: number) => {
    chrome.storage.local.get(['cartintel-current-product', 'cartintel-product-intelligence'], (result) => {
      const storageResult = result as Record<string, unknown>;
      
      const currentProduct = storageResult['cartintel-current-product'] as ProductDetectionResult | undefined;
      const productIntelligence = storageResult['cartintel-product-intelligence'] as ProductIntelligence | undefined;

      const activeNorm = normalizeUrl(currentActiveUrl);
      const prodNorm = normalizeUrl(currentProduct?.url);
      const intellNorm = normalizeUrl(productIntelligence?.originalUrl);

      let isMismatch = false;
      if (currentProduct && prodNorm !== activeNorm) {
        isMismatch = true;
      }

      if (isMismatch) {
        setProduct(null);
        setIntelligence(null);
        setDecisionRecommendation(null);
        setIsDetecting(true);
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'force_detect' }, () => chrome.runtime.lastError);
        }
      } else {
        setProduct(currentProduct || null);
        setIntelligence((productIntelligence && intellNorm === activeNorm) ? productIntelligence : null);
        setIsDetecting(false);
      }
    });
  };

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        setActiveTabUrl(tab.url);
        loadStorageAndValidate(tab.url, tab.id);
      }
    });

    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes['cartintel-current-product'] || changes['cartintel-product-intelligence']) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.url) {
            loadStorageAndValidate(tabs[0].url, tabs[0].id);
          }
        });
      }
    };
    
    chrome.storage.onChanged.addListener(storageListener);
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const getCurrencySymbol = (codeOrSymbol: string | null): string => {
    if (!codeOrSymbol) return "₹";
    const map: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      INR: "₹",
    };
    return map[codeOrSymbol.toUpperCase()] || codeOrSymbol;
  };

  const handleAnalyze = () => {
    if (!intelligence) {
      console.error("CartIntel: Cannot analyze. Product Intelligence is unavailable.");
      return;
    }
    console.log("CartIntel Product Intelligence:", intelligence);
    setShowIntelligence(true);
  };

  const handleCompare = async () => {
    if (!intelligence) return;
    
    if (activeTabUrl && normalizeUrl(intelligence.originalUrl) !== normalizeUrl(activeTabUrl)) {
      setComparisonError("Current product is still being detected. Please wait.");
      return;
    }

    setIsComparing(true);
    setComparisonError(null);
    setRankingError(null);
    setDecisionRecommendation(null);
    try {
      const result = await compareProduct(intelligence);
      console.log("[12] Response returned to extension");
      setComparisonResult(result);

      // Execute full decision & recommendation pipeline (Phase 1.12)
      try {
        const rawProducts = result.identity?.products || [];
        const candidates: RecommendationCandidate[] = rawProducts.map(p => ({
          product: p,
          isCurrentProduct: normalizeUrl(p.originalUrl) === normalizeUrl(intelligence.originalUrl),
          variantState: "explicitly_matching",
          isRefurbishedOrUsed: (p.originalTitle || "").toLowerCase().includes("refurbished") || (p.normalizedTitle || "").toLowerCase().includes("refurbished"),
          isUnavailable: false,
          savingsValue: null,
          savingsPercentage: null,
          currencyMismatch: false,
          finalRankingScore: p.confidence || 80,
          priceAvailabilityScore: 80,
          identityConfidenceScore: p.confidence || 80,
          qualityScore: 80,
          marketplaceReliabilityScore: 80,
          duplicateRedundancyScore: 0
        }));

        const req = {
          ...buildRecommendationRequest(intelligence.normalizedTitle || intelligence.originalTitle || ""),
          candidates
        };

        const recResult = buildExplainableRecommendation(req, candidates);
        setDecisionRecommendation(recResult);
      } catch (recEngineErr) {
        console.error("CartIntel: Decision recommendation pipeline error", recEngineErr);
      }

      // Only run legacy client-side ranking if rankedResult is absent from backend orchestrator
      if (!result.rankedResult) {
        try {
          const ranked = rankDeals(result.identity);
          setRankedDeals(ranked);
          try {
            const rec = recommendDeal(ranked);
            setRecommendation(rec);
          } catch (recErr) {
            console.error("CartIntel: Recommendation failed", recErr);
          }
        } catch (err) {
          setRankingError(err instanceof Error ? err.message : String(err));
        }
      }
    } catch (err) {
      setComparisonError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="w-[380px] bg-gray-50 text-gray-900 font-sans shadow-2xl rounded-2xl overflow-hidden border border-gray-200/50 flex flex-col max-h-[600px]">
      {/* Header */}
      <header className="px-5 py-4 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner shadow-blue-800/20">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-gray-900 leading-none mb-1">
            CartIntel
          </h1>
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">
            AI Shopping Copilot
          </p>
        </div>
      </header>

      {/* Main Content (Scrollable) */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-5 flex flex-col gap-4 min-h-full">
        
        {/* Current Website Card */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between transition-shadow hover:shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
              <Globe className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Current Website
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {product ? product.hostname : (isDetecting ? 'Detecting...' : 'Loading...')}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 shadow-sm ${
            isDetecting
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : showIntelligence 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : intelligence 
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : product 
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              isDetecting
                ? 'bg-orange-500'
                : showIntelligence 
                  ? 'bg-blue-500' 
                  : intelligence 
                    ? 'bg-green-500'
                    : product 
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
            }`} />
            {isDetecting
              ? 'Detecting...'
              : showIntelligence 
                ? 'Processed' 
                : intelligence 
                  ? 'Intelligence Ready'
                  : product 
                    ? 'Product Detected'
                    : 'Unavailable'}
          </span>
        </div>

        {/* Dynamic Content Area */}
        {decisionRecommendation && (
          <RecommendationPresentation
            recommendation={decisionRecommendation}
            getCurrencySymbol={getCurrencySymbol}
          />
        )}

        {comparisonResult ? (
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm flex flex-col shrink-0">
             <div className="p-4 flex flex-col gap-3">
                <h3 className="text-sm font-bold text-gray-800">Comparison Results</h3>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-900 flex flex-col gap-1.5">
                  <p><span className="font-bold">Matching Products:</span> {comparisonResult.identity.productCount > 1 ? comparisonResult.identity.productCount - 1 : 0}</p>
                  <p><span className="font-bold">Match Confidence:</span> {comparisonResult.identity.confidence}%</p>
                  <p><span className="font-bold">Marketplaces:</span> {comparisonResult.identity.marketplaces.join(', ')}</p>
                </div>

                {/* Primary Authoritative Ranking (from comparisonResult.rankedResult) */}
                {comparisonResult.rankedResult ? (
                  <div className="flex flex-col gap-3 mt-1">
                    {/* Best Offer Card */}
                    {comparisonResult.rankedResult.bestOffer && (
                      <div className="flex flex-col gap-2 border border-blue-200 rounded-xl p-3 bg-blue-50/50 shadow-sm">
                        <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-blue-100 pb-2">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          CartIntel Recommended Deal
                        </h3>
                        
                        <a 
                          href={comparisonResult.rankedResult.bestOffer.offer.url || undefined} 
                          target={comparisonResult.rankedResult.bestOffer.offer.url ? "_blank" : undefined}
                          rel={comparisonResult.rankedResult.bestOffer.offer.url ? "noopener noreferrer" : undefined}
                          onClick={(e) => {
                            if (comparisonResult.rankedResult?.bestOffer?.offer.url) {
                              e.preventDefault();
                              console.log(`\n[RENDERED LINK DEBUG]\nmerchant: ${comparisonResult.rankedResult.bestOffer.offer.seller}\nproductUrl: ${comparisonResult.rankedResult.bestOffer.offer.url}\nhref: ${comparisonResult.rankedResult.bestOffer.offer.url}\n------------------------\n`);
                              chrome.tabs.create({ url: comparisonResult.rankedResult.bestOffer.offer.url });
                            }
                          }}
                          className={`flex flex-col gap-1.5 mt-1 block hover:bg-blue-100/50 p-2 -mx-2 rounded-lg transition-colors ${comparisonResult.rankedResult.bestOffer.offer.url ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit">
                              Best Overall Deal
                            </div>
                            {comparisonResult.rankedResult.bestOffer.ranking.score > 0 && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                Score: {comparisonResult.rankedResult.bestOffer.ranking.score}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            {comparisonResult.rankedResult.bestOffer.offer.marketplaceLogo ? (
                              <img src={comparisonResult.rankedResult.bestOffer.offer.marketplaceLogo} alt={comparisonResult.rankedResult.bestOffer.offer.seller || 'Seller'} className="w-4 h-4 object-contain rounded-sm bg-white" />
                            ) : (
                              <div className="w-4 h-4 bg-gray-200 rounded-sm flex items-center justify-center text-gray-500">
                                <Store className="w-3 h-3" />
                              </div>
                            )}
                            <span className="text-xs font-semibold text-gray-700">{comparisonResult.rankedResult.bestOffer.offer.seller || comparisonResult.rankedResult.bestOffer.offer.source}</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">
                            {comparisonResult.rankedResult.bestOffer.offer.title}
                          </p>
                          <div className="flex justify-between items-center text-xs mt-1">
                            <span className="font-black text-green-700 text-base">
                              {getCurrencySymbol(comparisonResult.rankedResult.bestOffer.offer.pricing.currency)}
                              {comparisonResult.rankedResult.bestOffer.offer.pricing.finalPrice?.toLocaleString('en-IN') ?? 'N/A'}
                            </span>
                            <span className="text-blue-600 font-bold flex items-center gap-1">View Direct Deal <ExternalLink className="w-3 h-3" /></span>
                          </div>
                          {comparisonResult.rankedResult.bestOffer.ranking.reasons.length > 0 && (
                            <p className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded inline-block w-fit mt-1">
                              {comparisonResult.rankedResult.bestOffer.ranking.reasons.join(" • ")}
                            </p>
                          )}
                        </a>
                      </div>
                    )}

                    {/* Cheapest Offer Display (If distinct from Best Offer) */}
                    {comparisonResult.rankedResult.cheapestOffer && 
                     comparisonResult.rankedResult.cheapestOffer.offer.id !== comparisonResult.rankedResult.bestOffer?.offer.id && (
                      <div className="border border-green-200 rounded-lg p-2.5 bg-green-50/40 flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-green-800 uppercase tracking-wider">Cheapest Available Price</p>
                        <a 
                          href={comparisonResult.rankedResult.cheapestOffer.offer.url || undefined} 
                          target={comparisonResult.rankedResult.cheapestOffer.offer.url ? "_blank" : undefined} 
                          rel={comparisonResult.rankedResult.cheapestOffer.offer.url ? "noopener noreferrer" : undefined} 
                          onClick={(e) => {
                            if (comparisonResult.rankedResult?.cheapestOffer?.offer.url) {
                              e.preventDefault();
                              chrome.tabs.create({ url: comparisonResult.rankedResult.cheapestOffer.offer.url });
                            }
                          }}
                          className="flex justify-between items-center text-xs bg-white hover:bg-gray-50 border border-gray-100 p-2 rounded shadow-sm transition-colors block"
                        >
                          <div className="flex items-center gap-2 truncate mr-2">
                            {comparisonResult.rankedResult.cheapestOffer.offer.marketplaceLogo ? (
                              <img src={comparisonResult.rankedResult.cheapestOffer.offer.marketplaceLogo} alt={comparisonResult.rankedResult.cheapestOffer.offer.seller || 'Seller'} className="w-3.5 h-3.5 object-contain rounded-sm bg-white" />
                            ) : (
                              <div className="w-3.5 h-3.5 bg-gray-200 rounded-sm flex items-center justify-center text-gray-500">
                                <Store className="w-2.5 h-2.5" />
                              </div>
                            )}
                            <span className="font-semibold text-gray-700 truncate">{comparisonResult.rankedResult.cheapestOffer.offer.seller || comparisonResult.rankedResult.cheapestOffer.offer.source}</span>
                          </div>
                          <span className="font-bold text-green-700 shrink-0">
                            {getCurrencySymbol(comparisonResult.rankedResult.cheapestOffer.offer.pricing.currency)}
                            {comparisonResult.rankedResult.cheapestOffer.offer.pricing.finalPrice?.toLocaleString('en-IN')}
                          </span>
                        </a>
                      </div>
                    )}

                    {/* All Ranked Offers List */}
                    {comparisonResult.rankedResult.offers.length > 0 && (
                      <div className="flex flex-col gap-2 mt-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          All Ranked Offers ({comparisonResult.rankedResult.offers.length})
                        </p>
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {comparisonResult.rankedResult.offers.map((rankedOffer, idx) => (
                            <a 
                              key={rankedOffer.offer.id || idx} 
                              href={rankedOffer.offer.url || undefined} 
                              target={rankedOffer.offer.url ? "_blank" : undefined} 
                              rel={rankedOffer.offer.url ? "noopener noreferrer" : undefined}
                              onClick={(e) => {
                                if (rankedOffer.offer.url) {
                                  e.preventDefault();
                                  console.log(`\n[RENDERED LINK DEBUG]\nmerchant: ${rankedOffer.offer.seller}\nproductUrl: ${rankedOffer.offer.url}\nhref: ${rankedOffer.offer.url}\n------------------------\n`);
                                  chrome.tabs.create({ url: rankedOffer.offer.url });
                                }
                              }}
                              className={`border ${
                                rankedOffer.offer.id === comparisonResult.rankedResult?.bestOffer?.offer.id 
                                  ? 'border-green-300 bg-green-50/50 hover:bg-green-100/50' 
                                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                              } rounded-lg p-3 shadow-sm flex flex-col gap-1.5 transition-colors block ${rankedOffer.offer.url ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-2">
                                  {rankedOffer.offer.marketplaceLogo ? (
                                    <img src={rankedOffer.offer.marketplaceLogo} alt={rankedOffer.offer.seller || 'Seller'} className="w-4 h-4 object-contain rounded-sm bg-white" />
                                  ) : (
                                    <div className="w-4 h-4 bg-gray-200 rounded-sm flex items-center justify-center text-gray-500">
                                      <Store className="w-3 h-3" />
                                    </div>
                                  )}
                                  <span className="text-[11px] font-bold text-gray-800">{rankedOffer.offer.seller || rankedOffer.offer.source}</span>
                                </div>
                                {rankedOffer.offer.id === comparisonResult.rankedResult?.bestOffer?.offer.id && (
                                  <span className="text-[9px] font-extrabold text-green-700 bg-green-100 px-1.5 py-0.5 rounded uppercase">Best Deal</span>
                                )}
                                {rankedOffer.offer.id === comparisonResult.rankedResult?.cheapestOffer?.offer.id &&
                                 rankedOffer.offer.id !== comparisonResult.rankedResult?.bestOffer?.offer.id && (
                                  <span className="text-[9px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase">Lowest Price</span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-snug" title={rankedOffer.offer.title}>
                                {rankedOffer.offer.title}
                              </p>
                              <div className="flex items-end justify-between mt-0.5">
                                <div className="flex flex-col gap-1">
                                  <span className="font-black text-gray-900 text-sm">
                                    {rankedOffer.offer.pricing.finalPrice !== null 
                                      ? `${getCurrencySymbol(rankedOffer.offer.pricing.currency)}${rankedOffer.offer.pricing.finalPrice.toLocaleString('en-IN')}`
                                      : 'N/A'}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                                  View Deal <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reference / Ineligible Offers List */}
                    {comparisonResult.rankedResult.referenceOffers && comparisonResult.rankedResult.referenceOffers.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1 border-t border-gray-100 pt-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Other Listings / Ineligible ({comparisonResult.rankedResult.referenceOffers.length})</p>
                        <div className="flex flex-col gap-1.5 opacity-75">
                          {comparisonResult.rankedResult.referenceOffers.map((refOffer, idx) => (
                            <div key={refOffer.offer.id || idx} className="bg-gray-50 border border-gray-200 rounded p-2 text-xs flex justify-between items-center">
                              <span className="font-medium text-gray-700 truncate mr-2">{refOffer.offer.seller || refOffer.offer.source}</span>
                              <span className="font-bold text-gray-500 shrink-0">{refOffer.ranking.reasons[0] || 'Ineligible'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fallback to legacy recommendation & rankedDeals if rankedResult is absent */
                  <>
                    {/* CartIntel Recommendation */}
                    {recommendation && (
                      <div className="flex flex-col gap-2 mt-2 border border-blue-200 rounded-xl p-3 bg-blue-50/50 shadow-sm">
                        <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-blue-100 pb-2">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          CartIntel Recommendation
                        </h3>
                        
                        {recommendation.state === "recommended_deal" && recommendation.recommendedOffer && (
                          <a 
                            href={recommendation.recommendedOffer.product.originalUrl || undefined} 
                            target={recommendation.recommendedOffer.product.originalUrl ? "_blank" : undefined}
                            rel={recommendation.recommendedOffer.product.originalUrl ? "noopener noreferrer" : undefined}
                            onClick={(e) => {
                              if (recommendation.recommendedOffer?.product.originalUrl) {
                                e.preventDefault();
                                console.log(`\n[RENDERED LINK DEBUG]\nmerchant: ${recommendation.recommendedOffer.product.metadata.marketplace}\nproductUrl: ${recommendation.recommendedOffer.product.originalUrl}\nhref: ${recommendation.recommendedOffer.product.originalUrl}\n------------------------\n`);
                                chrome.tabs.create({ url: recommendation.recommendedOffer.product.originalUrl });
                              }
                            }}
                            className={`flex flex-col gap-1.5 mt-1 block hover:bg-blue-100/50 p-2 -mx-2 rounded-lg transition-colors ${recommendation.recommendedOffer.product.originalUrl ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                          >
                            <div className="bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mb-1">
                              Best Price
                            </div>
                            <div className="flex items-center gap-2 mb-0.5">
                              {recommendation.recommendedOffer.product.metadata.marketplaceLogo ? (
                                <img src={recommendation.recommendedOffer.product.metadata.marketplaceLogo} alt={recommendation.recommendedOffer.product.metadata.marketplace} className="w-4 h-4 object-contain rounded-sm bg-white" />
                              ) : (
                                <div className="w-4 h-4 bg-gray-200 rounded-sm flex items-center justify-center text-gray-500">
                                  <Store className="w-3 h-3" />
                                </div>
                              )}
                              <span className="text-xs font-semibold text-gray-700">{recommendation.recommendedOffer.product.metadata.marketplace}</span>
                            </div>
                            <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">
                              {recommendation.recommendedOffer.product.originalTitle || recommendation.recommendedOffer.product.metadata.hostname}
                            </p>
                            <div className="flex justify-between items-center text-xs mt-1">
                              <span className="font-black text-green-700 text-base">
                                {getCurrencySymbol(recommendation.recommendedOffer.product.originalCurrency)}{recommendation.recommendedOffer.product.originalPrice?.toLocaleString('en-IN')}
                              </span>
                              <span className="text-blue-600 font-bold flex items-center gap-1">View Deal <ExternalLink className="w-3 h-3" /></span>
                            </div>
                            <p className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded inline-block w-fit mt-1">
                              {recommendation.reason}
                            </p>
                          </a>
                        )}

                        {recommendation.state === "recommended_deal" && recommendation.tiedOffers.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-100 flex flex-col gap-1.5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Equally Best Prices:</p>
                            {recommendation.tiedOffers.map((tied, idx) => (
                              <a key={idx} 
                                 href={tied.product.originalUrl || undefined} 
                                 target={tied.product.originalUrl ? "_blank" : undefined} 
                                 rel={tied.product.originalUrl ? "noopener noreferrer" : undefined} 
                                 onClick={(e) => {
                                   if (tied.product.originalUrl) {
                                     e.preventDefault();
                                     console.log(`\n[RENDERED LINK DEBUG]\nmerchant: ${tied.product.metadata.marketplace}\nproductUrl: ${tied.product.originalUrl}\nhref: ${tied.product.originalUrl}\n------------------------\n`);
                                     chrome.tabs.create({ url: tied.product.originalUrl });
                                   }
                                 }}
                                 className={`flex justify-between items-center text-xs bg-white hover:bg-gray-50 border border-gray-100 p-2 rounded shadow-sm transition-colors block ${tied.product.originalUrl ? 'cursor-pointer' : 'cursor-default opacity-80'}`}>
                                <div className="flex items-center gap-2 truncate mr-2">
                                  {tied.product.metadata.marketplaceLogo ? (
                                    <img src={tied.product.metadata.marketplaceLogo} alt={tied.product.metadata.marketplace} className="w-3.5 h-3.5 object-contain rounded-sm bg-white" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 bg-gray-200 rounded-sm flex items-center justify-center text-gray-500">
                                      <Store className="w-2.5 h-2.5" />
                                    </div>
                                  )}
                                  <span className="font-semibold text-gray-700 truncate">{tied.product.metadata.marketplace}</span>
                                </div>
                                <span className="font-bold text-gray-900 shrink-0">
                                  {getCurrencySymbol(tied.product.originalCurrency)}{tied.product.originalPrice?.toLocaleString('en-IN')}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}

                        {recommendation.state === "current_product_is_best_price" && (
                          <div className="flex flex-col gap-1 mt-1">
                            <p className="text-sm font-bold text-gray-900">{recommendation.reason}</p>
                            <p className="text-xs text-gray-600">You're already looking at the best available price.</p>
                          </div>
                        )}

                        {recommendation.state === "no_matching_offers" && (
                          <p className="text-sm font-semibold text-gray-700 mt-1">{recommendation.reason}</p>
                        )}

                        {recommendation.state === "currency_mismatch_prevents_recommendation" && (
                          <p className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded mt-1">
                            {recommendation.reason}
                          </p>
                        )}

                        {recommendation.state === "current_product_has_no_price" && (
                          <p className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 p-2 rounded mt-1">
                            {recommendation.reason}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {rankedDeals && (
                      <div className="flex flex-col gap-3 mt-1">
                        {/* Current Product Indicator */}
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-1.5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Product</p>
                          
                          <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight" title={rankedDeals.currentProduct.originalTitle || 'Unknown Product'}>
                            {rankedDeals.currentProduct.originalTitle || 'Unknown Product'}
                          </p>

                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              {rankedDeals.currentProduct.metadata.marketplaceLogo ? (
                                <img src={rankedDeals.currentProduct.metadata.marketplaceLogo} alt={rankedDeals.currentProduct.metadata.marketplace} className="w-3.5 h-3.5 object-contain rounded-sm" />
                              ) : (
                                <div className="w-3.5 h-3.5 bg-gray-200 rounded-sm flex items-center justify-center text-gray-500">
                                  <Store className="w-2.5 h-2.5" />
                                </div>
                              )}
                              <span className="text-[11px] font-semibold text-gray-700 capitalize">{rankedDeals.currentProduct.metadata.marketplace}</span>
                            </div>
                            <span className="text-gray-900 font-black text-sm">
                              {rankedDeals.currentProduct.originalPrice !== null 
                                ? `${getCurrencySymbol(rankedDeals.currentProduct.originalCurrency)}${rankedDeals.currentProduct.originalPrice.toLocaleString('en-IN')}`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Matching Offers */}
                        {rankedDeals.offers.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Matching Offers</p>
                            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                              {rankedDeals.offers.map((offer, idx) => (
                                <a 
                                  key={idx} 
                                  href={offer.product.originalUrl || undefined} 
                                  target={offer.product.originalUrl ? "_blank" : undefined} 
                                  rel={offer.product.originalUrl ? "noopener noreferrer" : undefined}
                                  onClick={(e) => {
                                    if (offer.product.originalUrl) {
                                      e.preventDefault();
                                      console.log(`\n[RENDERED LINK DEBUG]\nmerchant: ${offer.product.metadata.marketplace}\nproductUrl: ${offer.product.originalUrl}\nhref: ${offer.product.originalUrl}\n------------------------\n`);
                                      chrome.tabs.create({ url: offer.product.originalUrl });
                                    }
                                  }}
                                  className={`border ${offer === rankedDeals.bestOffer ? 'border-green-300 bg-green-50/50 hover:bg-green-100/50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'} rounded-lg p-3 shadow-sm flex flex-col gap-1.5 transition-colors block ${offer.product.originalUrl ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                                >
                                  <div className="flex items-center gap-2 mb-0.5">
                                    {offer.product.metadata.marketplaceLogo ? (
                                      <img src={offer.product.metadata.marketplaceLogo} alt={offer.product.metadata.marketplace} className="w-4 h-4 object-contain rounded-sm bg-white" />
                                    ) : (
                                      <div className="w-4 h-4 bg-gray-200 rounded-sm flex items-center justify-center text-gray-500">
                                        <Store className="w-3 h-3" />
                                      </div>
                                    )}
                                    <span className="text-[11px] font-bold text-gray-800">{offer.product.metadata.marketplace}</span>
                                  </div>
                                  <p className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-snug" title={offer.product.originalTitle || offer.product.metadata.hostname}>
                                    {offer.product.originalTitle || offer.product.metadata.hostname}
                                  </p>
                                  <div className="flex items-end justify-between mt-0.5">
                                    <div className="flex flex-col gap-1">
                                      {offer.product.originalPrice !== null ? (
                                        <span className="font-black text-gray-900 text-sm">{getCurrencySymbol(offer.product.originalCurrency)}{offer.product.originalPrice.toLocaleString('en-IN')}</span>
                                      ) : (
                                        <span className="font-bold text-gray-500 text-sm">N/A</span>
                                      )}
                                      {offer.variantState === "missing_unknown" && (
                                        <span className="text-[9px] font-semibold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded w-fit border border-yellow-200">Unverified variant</span>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      {offer.savingsValue !== null && offer.savingsValue > 0 && offer.savingsPercentage !== null && (
                                        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                          Save {Math.round(offer.savingsPercentage)}%
                                        </span>
                                      )}
                                      <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                                        View Deal <ExternalLink className="w-2.5 h-2.5" />
                                      </span>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Warnings and Errors */}
                        {rankedDeals.hasCurrencyMismatch && (
                          <div className="bg-yellow-50 p-2.5 rounded-lg border border-yellow-200 text-[11px] text-yellow-800 flex items-start gap-2">
                             <Info className="w-3.5 h-3.5 shrink-0 text-yellow-600 mt-0.5" />
                             <span>Some offers could not be directly compared due to differing currencies.</span>
                          </div>
                        )}
                        
                        {rankingError && (
                          <div className="text-xs text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
                            <span className="font-bold">Ranking Error:</span> {rankingError}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!rankedDeals && comparisonResult.identity.productCount <= 1 && !comparisonError && (
                  <p className="text-xs text-gray-500 italic mt-2">No matching marketplace offers found.</p>
                )}

                {comparisonResult.errors && comparisonResult.errors.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 mt-1 flex flex-col gap-1">
                    <p className="font-bold mb-0.5 flex items-center gap-1.5"><Info className="w-3.5 h-3.5"/> Search Provider Warnings:</p>
                    {comparisonResult.errors.map((err, i) => (
                      <p key={i} className="pl-5">• {err.providerId}: {err.error}</p>
                    ))}
                  </div>
                )}
             </div>
          </div>
        ) : showIntelligence && intelligence && product ? (
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm flex flex-col shrink-0">
             {(product.image || intelligence.originalImage) && (
               <div className="w-full h-40 bg-white flex items-center justify-center overflow-hidden border-b border-gray-100 p-2">
                 <img 
                   src={product.image || intelligence.originalImage || ''} 
                   alt={product.title || 'Product Image'} 
                   className="object-contain w-full h-full"
                   onError={(e) => {
                     const target = e.target as HTMLElement;
                     if (target && target.parentElement) {
                       target.parentElement.style.display = 'none';
                     }
                   }}
                 />
               </div>
             )}
             <div className="p-4 flex flex-col gap-3">
                <h3 className="text-sm font-bold text-gray-800">Product Intelligence</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-700 font-mono flex flex-col gap-1">
                  <p><span className="font-bold text-gray-900">Brand:</span> {intelligence.brand || 'Unknown'}</p>
                  <p><span className="font-bold text-gray-900">Category:</span> {intelligence.category || 'Unknown'}</p>
                  <p><span className="font-bold text-gray-900">Confidence:</span> {intelligence.confidence}%</p>
                  <p className="truncate"><span className="font-bold text-gray-900">Fingerprint:</span> {intelligence.fingerprint}</p>
                </div>
             </div>
          </div>
        ) : product ? (
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm flex flex-col shrink-0">
            {product.image && (
              <div className="w-full h-40 bg-white flex items-center justify-center overflow-hidden border-b border-gray-100 p-2">
                <img 
                  src={product.image} 
                  alt={product.title || 'Product Image'} 
                  className="object-contain w-full h-full"
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    if (target && target.parentElement) {
                      target.parentElement.style.display = 'none';
                    }
                  }}
                />
              </div>
            )}
            <div className="p-4 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-gray-800 line-clamp-2" title={product.title || ''}>
                {product.title || 'Unknown Product'}
              </h3>
              {product.price !== null && (
                <p className="text-lg font-black text-blue-600">
                  {getCurrencySymbol(product.currency)}{product.price.toFixed(2)}
                </p>
              )}
              <a 
                href={product.url || undefined} 
                target={product.url ? "_blank" : undefined} 
                rel={product.url ? "noopener noreferrer" : undefined} 
                onClick={(e) => {
                  if (product?.url) {
                    e.preventDefault();
                    chrome.tabs.create({ url: product.url });
                  }
                }}
                className={`text-[11px] font-medium text-blue-500 flex items-center gap-1 w-fit mt-1 ${product.url ? 'hover:underline cursor-pointer' : 'cursor-default opacity-80'}`}
              >
                View on {product.hostname} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm text-center shrink-0">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">
              Waiting for product analysis...
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[250px] mx-auto">
              Navigate to a product page to start scanning for better prices and reviews.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!showIntelligence && (
          <button 
            onClick={handleAnalyze}
            disabled={!product}
            className={`w-full mt-1 font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 ${
              !product 
                ? 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${!product ? 'fill-gray-400' : 'fill-blue-200'}`} />
            Analyze Product
          </button>
        )}

        {showIntelligence && !comparisonResult && (
          <div className="flex flex-col gap-2 mt-1 shrink-0">
            <button 
              onClick={handleCompare}
              disabled={isComparing}
              className={`w-full font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isComparing 
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30'
              }`}
            >
              {isComparing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {isComparing ? 'Comparing Prices...' : 'Compare Prices'}
            </button>
            
            {comparisonError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg text-center mt-1">
                {comparisonError}
              </div>
            )}
            
            <button 
              onClick={() => {
                if (product?.url) {
                  chrome.tabs.create({ url: product.url });
                }
              }}
              className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              View Original Product
            </button>
          </div>
        )}

        {comparisonResult && (
           <div className="flex flex-col gap-2 mt-1 shrink-0">
            <button 
              onClick={() => {
                setComparisonResult(null);
                setRankedDeals(null);
                setRecommendation(null);
                setComparisonError(null);
                setRankingError(null);
              }}
              className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Back to Analysis
            </button>
             </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-5 py-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500 shrink-0">
        <button className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
        <button className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
          <Info className="w-3.5 h-3.5" />
          About
        </button>
      </footer>
    </div>
  );
}
