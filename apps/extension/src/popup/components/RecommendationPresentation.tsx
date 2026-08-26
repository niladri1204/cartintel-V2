import { Sparkles, CheckCircle2, ShieldCheck, Tag, ExternalLink, Layers, Award } from "lucide-react";
import type { RecommendationResult } from "../../intelligence/recommendationTypes";
import { classifyMerchantTier } from "../../intelligence/merchantCoverage";

interface RecommendationPresentationProps {
  recommendation: RecommendationResult;
  getCurrencySymbol?: (codeOrSymbol: string | null) => string;
}

export function getMerchantDirectUrl(p?: any): string | null {
  if (!p) return null;
  if (p.originalUrl && typeof p.originalUrl === "string" && p.originalUrl.startsWith("http")) {
    try {
      const u = new URL(p.originalUrl);
      const host = u.hostname.toLowerCase();
      // Ensure it is a direct merchant host, never provider/Google search
      if (!host.includes("google.com") && !host.includes("google.co.in") && !host.includes("serper.dev")) {
        return p.originalUrl;
      }
    } catch {}
  }

  const title = p.originalTitle || p.normalizedTitle || "";
  const cleanTitle = title
    .replace(/[|(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const enc = encodeURIComponent(cleanTitle);

  const rawMerchant = (
    p.metadata?.marketplace ||
    p.metadata?.hostname ||
    p.source ||
    ""
  ).toLowerCase().trim();

  if (rawMerchant.includes("amazon")) {
    return `https://www.amazon.in/s?k=${enc}`;
  }
  if (rawMerchant.includes("flipkart")) {
    return `https://www.flipkart.com/search?q=${enc}`;
  }
  if (rawMerchant.includes("croma")) {
    return `https://www.croma.com/searchB?q=${enc}`;
  }
  if (rawMerchant.includes("reliance") || rawMerchant.includes("reliancedigital")) {
    return `https://www.reliancedigital.in/search?q=${enc}`;
  }
  if (rawMerchant.includes("vijay") || rawMerchant.includes("vijaysales")) {
    return `https://www.vijaysales.com/search/${enc}`;
  }
  if (rawMerchant.includes("jiomart")) {
    return `https://www.jiomart.com/search/${enc}`;
  }
  if (rawMerchant.includes("zepto")) {
    return `https://www.zeptonow.com/search?q=${enc}`;
  }
  if (rawMerchant.includes("desertcart")) {
    return `https://www.desertcart.in/search/${enc}`;
  }
  if (rawMerchant.includes("tatacliq") || rawMerchant.includes("tata cliq")) {
    return `https://www.tatacliq.com/search/?searchCategory=all&text=${enc}`;
  }
  if (rawMerchant.includes("myg")) {
    return `https://www.myg.in/catalogsearch/result/?q=${enc}`;
  }
  if (rawMerchant.includes("poorvika")) {
    return `https://www.poorvika.com/search?q=${enc}`;
  }
  if (rawMerchant.includes("sangeetha")) {
    return `https://www.sangeethamobiles.com/search?q=${enc}`;
  }
  if (rawMerchant.includes("vasanth") || rawMerchant === "co") {
    return `https://www.vasanthandco.in/search?q=${enc}`;
  }
  if (rawMerchant.includes("microless")) {
    return `https://india.microless.com/search/?query=${enc}`;
  }
  if (rawMerchant.includes("apple")) {
    return `https://www.apple.com/in/search/${enc}`;
  }
  if (rawMerchant.includes("samsung")) {
    return `https://www.samsung.com/in/search/?searchvalue=${enc}`;
  }
  if (rawMerchant.includes("oneplus")) {
    return `https://www.oneplus.in/search?q=${enc}`;
  }
  if (rawMerchant.includes("google")) {
    return `https://store.google.com/search?q=${enc}`;
  }
  if (rawMerchant.includes("vivo")) {
    return `https://shop.vivo.com/in/search?keyword=${enc}`;
  }
  if (rawMerchant.includes("ovantica")) {
    return `https://ovantica.com/catalogsearch/result/?q=${enc}`;
  }
  if (rawMerchant.includes("cashify")) {
    return `https://www.cashify.in/search?q=${enc}`;
  }

  // Generic merchant fallback if hostname is available
  if (p.metadata?.hostname && !p.metadata.hostname.includes("google")) {
    return `https://${p.metadata.hostname}/search?q=${enc}`;
  }

  return null;
}

export function RecommendationPresentation({
  recommendation,
  getCurrencySymbol = (c) => (c === "USD" ? "$" : "₹")
}: RecommendationPresentationProps) {
  const {
    recommendedCandidate,
    recommendationScore,
    confidence,
    reasons,
    tradeOffs,
    alternatives,
    productOfferDetails
  } = recommendation;

  const recProduct = recommendedCandidate?.product;
  const currSymbol = getCurrencySymbol(recProduct?.originalCurrency || "INR");

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case "high":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const handleLinkClick = (url?: string | null) => {
    if (url && typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url });
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      {/* Header & Confidence Badge */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">AI Decision Recommendation</h2>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getConfidenceBadge(confidence)}`}>
          {confidence} Confidence
        </span>
      </div>

      {/* Recommended Product & Why this product? */}
      {recProduct ? (
        <div className="flex flex-col gap-2.5 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-widest block mb-0.5">
                Recommended Deal
              </span>
              <h3 className="text-sm font-bold text-gray-900 leading-snug">
                {recProduct.brand ? `${recProduct.brand.toUpperCase()} ` : ""}
                {recProduct.model || recProduct.originalTitle || "Canonical Product"}
              </h3>
              {recProduct.metadata?.marketplace && recProduct.originalPrice && (
                <span className="text-xs font-extrabold text-emerald-700 block mt-0.5">
                  Available from {recProduct.metadata.marketplace} at {currSymbol}{recProduct.originalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {recommendationScore > 0 && (
              <span className="px-2 py-1 bg-blue-600 text-white font-extrabold text-xs rounded-lg shadow-sm shrink-0">
                {recommendationScore}/100
              </span>
            )}
          </div>

          {/* Product Summary */}
          {productOfferDetails?.bestProductSummary && (
            <p className="text-xs text-blue-950 font-medium leading-normal bg-white/70 p-2 rounded-lg border border-blue-100">
              {productOfferDetails.bestProductSummary}
            </p>
          )}

          {/* Why this product? Reasons */}
          {reasons.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Why this deal?
              </span>
              <ul className="flex flex-col gap-1 pl-1">
                {reasons.map((reason, idx) => (
                  <li key={idx} className="text-[11px] text-gray-700 flex items-start gap-1.5 leading-tight">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{reason.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 text-center font-medium">
          No eligible primary product recommendation available for this query.
        </div>
      )}

      {/* Offer Breakdown Summaries */}
      {(productOfferDetails?.bestOfferSummary || productOfferDetails?.cheapestOfferSummary || productOfferDetails?.bestValueOfferSummary) && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Offer Breakdown</h3>

          {/* Best Overall Offer */}
          {productOfferDetails?.bestOfferSummary && (
            <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/40 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-blue-600" /> Best Overall Offer
                </span>
                {(recommendation.bestOffer?.product?.originalPrice || recProduct?.originalPrice) && (
                  <span className="text-xs font-black text-blue-900">
                    {currSymbol}{(recommendation.bestOffer?.product?.originalPrice || recProduct?.originalPrice)?.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-gray-800 leading-tight flex-1">{productOfferDetails.bestOfferSummary}</span>
                {(() => {
                  const directUrl = getMerchantDirectUrl(recommendation.bestOffer?.product || recProduct);
                  if (!directUrl) return null;
                  return (
                    <button
                      onClick={() => handleLinkClick(directUrl)}
                      className="text-[10px] font-extrabold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-md border border-blue-300 shadow-2xs shrink-0 transition-colors"
                    >
                      View Deal <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Best Value Offer */}
          {productOfferDetails?.bestValueOfferSummary && (
            <div className="border border-purple-200 rounded-xl p-3 bg-purple-50/40 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Best Value Offer
                </span>
                {recommendation.bestValueOffer?.product?.originalPrice && (
                  <span className="text-xs font-black text-purple-900">
                    {currSymbol}{recommendation.bestValueOffer.product.originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-gray-800 leading-tight flex-1">{productOfferDetails.bestValueOfferSummary}</span>
                {(() => {
                  const directUrl = getMerchantDirectUrl(recommendation.bestValueOffer?.product);
                  if (!directUrl) return null;
                  return (
                    <button
                      onClick={() => handleLinkClick(directUrl)}
                      className="text-[10px] font-extrabold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-white hover:bg-purple-50 px-2.5 py-1 rounded-md border border-purple-300 shadow-2xs shrink-0 transition-colors"
                    >
                      View Deal <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Cheapest Offer */}
          {productOfferDetails?.cheapestOfferSummary && (
            <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/40 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" /> Cheapest Offer
                </span>
                {recommendation.cheapestOffer?.product?.originalPrice && (
                  <span className="text-xs font-black text-emerald-900">
                    {currSymbol}{recommendation.cheapestOffer.product.originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-gray-800 leading-tight flex-1">{productOfferDetails.cheapestOfferSummary}</span>
                {(() => {
                  const directUrl = getMerchantDirectUrl(recommendation.cheapestOffer?.product);
                  if (!directUrl) return null;
                  return (
                    <button
                      onClick={() => handleLinkClick(directUrl)}
                      className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs shrink-0 transition-colors"
                    >
                      View Deal <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Evidence-based Trade-offs */}
      {tradeOffs && tradeOffs.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Key Trade-offs</h3>
          <div className="flex flex-col gap-1.5">
            {tradeOffs.map((tradeOff, idx) => (
              <div key={idx} className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col gap-1 text-xs">
                <span className="font-bold text-amber-900">{tradeOff.aspect}</span>
                <div className="flex items-start gap-1 text-emerald-800">
                  <span className="font-bold text-emerald-600">+</span>
                  <span>{tradeOff.positiveImpact}</span>
                </div>
                <div className="flex items-start gap-1 text-amber-800">
                  <span className="font-bold text-amber-600">-</span>
                  <span>{tradeOff.negativeImpact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Alternatives Section */}
      {alternatives && alternatives.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-gray-600" /> Alternatives ({alternatives.length})
          </h3>
          <div className="flex flex-col gap-2">
            {alternatives.map((alt, idx) => {
              const altProd = alt.candidate?.product;
              return (
                <div key={altProd?.fingerprint || idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900 leading-snug">
                        {altProd?.brand ? `${altProd.brand.toUpperCase()} ` : ""}
                        {altProd?.model || altProd?.originalTitle || "Alternative"}
                      </h4>
                    </div>
                    {alt.scoreDifference > 0 && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                        -{alt.scoreDifference} Score Diff
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight pl-5.5">{alt.comparisonMessage}</p>
                  {altProd?.originalUrl && (
                    <button
                      onClick={() => handleLinkClick(altProd.originalUrl)}
                      className="self-end text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-0.5"
                    >
                      View Alternative <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ALL AVAILABLE OFFERS & AVAILABLE MARKETPLACES Section */}
      {(() => {
        const rawOffers = recommendation.allEligibleOffers || [];

        // Order offers by Merchant Tier (Tier 1 -> Tier 2 -> Tier 3), and within each tier by confidence/rank and price
        const displayOffers = [...rawOffers].sort((a, b) => {
          const mA = a.product?.metadata?.marketplace || a.product?.metadata?.hostname || (a.product as any)?.source;
          const mB = b.product?.metadata?.marketplace || b.product?.metadata?.hostname || (b.product as any)?.source;
          const tierA = classifyMerchantTier(mA).tier;
          const tierB = classifyMerchantTier(mB).tier;

          if (tierA !== tierB) {
            return tierA - tierB;
          }

          // Within same tier, sort by product match confidence / score
          const scoreA = a.identityConfidenceScore || a.finalRankingScore || 0;
          const scoreB = b.identityConfidenceScore || b.finalRankingScore || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }

          // Price ascending
          const priceA = a.product?.originalPrice ?? Infinity;
          const priceB = b.product?.originalPrice ?? Infinity;
          return priceA - priceB;
        });

        if (displayOffers.length === 0) return null;

        // Boundary D URL Trace
        for (const cand of displayOffers) {
          const p = cand.product;
          const merchant = p?.metadata?.marketplace || p?.metadata?.hostname || (p as any)?.source || "Merchant";
          if (p?.originalUrl) {
            let host = "none";
            try {
              host = new URL(p.originalUrl).hostname;
            } catch {}
            console.log(
              `[URLTrace:Popup] merchant=${merchant} hasOriginalUrl=${Boolean(p.originalUrl)} host=${host}`
            );
          }
        }

        const uniqueMarketplaces = Array.from(
          new Set(
            displayOffers
              .map(c => c.product?.metadata?.marketplace || c.product?.metadata?.hostname || (c.product as any)?.source)
              .filter(Boolean)
          )
        );

        return (
          <div className="flex flex-col gap-2.5 bg-gray-50/50 p-3 rounded-xl border border-gray-200 shadow-sm mt-1">
            {/* Available Marketplaces */}
            {uniqueMarketplaces.length > 0 && (
              <div className="flex flex-col gap-1 pb-2 border-b border-gray-200">
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Available Across {uniqueMarketplaces.length} Marketplaces
                </span>
                <div className="flex flex-wrap gap-1">
                  {uniqueMarketplaces.map((mkt, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-white text-gray-800 font-semibold text-[10px] rounded-md border border-gray-200 shadow-2xs"
                    >
                      {mkt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* All Available Offers */}
            <h3 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>All Available Offers</span>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded-full">
                {displayOffers.length}
              </span>
            </h3>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
              {displayOffers.map((cand, idx) => {
                const p = cand.product;
                const merchant = p?.metadata?.marketplace || p?.metadata?.hostname || (p as any)?.source || "Merchant";
                const priceStr = p?.originalPrice != null
                  ? `${getCurrencySymbol(p.originalCurrency || "INR")}${p.originalPrice.toLocaleString("en-IN")}`
                  : "Price N/A";

                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-2 shadow-xs transition-colors hover:border-gray-300"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {merchant}
                        </span>
                        {(p as any)?.availability && (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded shrink-0">
                            {(p as any).availability}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 truncate leading-tight" title={p?.originalTitle || p?.normalizedTitle || ""}>
                        {p?.originalTitle || p?.normalizedTitle || "Product"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-gray-900">
                        {priceStr}
                      </span>
                      {(() => {
                        const directUrl = getMerchantDirectUrl(p);
                        if (!directUrl) return null;
                        return (
                          <button
                            onClick={() => handleLinkClick(directUrl)}
                            className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md border border-blue-200 transition-colors"
                          >
                            View Deal <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Direct Merchant Link CTA */}
      {(() => {
        const directUrl = getMerchantDirectUrl(recProduct);
        if (!directUrl) return null;
        return (
          <button
            onClick={() => handleLinkClick(directUrl)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 mt-1"
          >
            Buy Direct from {recProduct?.metadata?.marketplace || (recProduct as any)?.source || "Merchant"}
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        );
      })()}
    </div>
  );
}
