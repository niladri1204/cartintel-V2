import { Sparkles, CheckCircle2, ShieldCheck, Tag, ExternalLink, Layers, Award } from "lucide-react";
import type { RecommendationResult } from "../../intelligence/recommendationTypes";

interface RecommendationPresentationProps {
  recommendation: RecommendationResult;
  getCurrencySymbol?: (codeOrSymbol: string | null) => string;
}

export function RecommendationPresentation({
  recommendation,
  getCurrencySymbol = (c) => (c === "USD" ? "$" : "₹")
}: RecommendationPresentationProps) {
  const {
    recommendedCandidate,
    recommendationScore,
    confidence,
    confidenceDetails,
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
                Recommended Product
              </span>
              <h3 className="text-sm font-bold text-gray-900 leading-snug">
                {recProduct.brand ? `${recProduct.brand.toUpperCase()} ` : ""}
                {recProduct.model || recProduct.originalTitle || "Canonical Product"}
              </h3>
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
                Why this product?
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

          {/* Best Offer Summary */}
          {productOfferDetails?.bestOfferSummary && (
            <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/40 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3 h-3 text-blue-600" /> Best Overall Offer
                </span>
                {recProduct?.originalPrice && (
                  <span className="text-xs font-black text-emerald-700">
                    {currSymbol}{recProduct.originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800 leading-tight">{productOfferDetails.bestOfferSummary}</span>
                {recProduct?.originalUrl && (
                  <button
                    onClick={() => handleLinkClick(recProduct.originalUrl)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-blue-200 shadow-sm shrink-0 ml-2"
                  >
                    Buy Now <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cheapest Offer Summary */}
          {productOfferDetails?.cheapestOfferSummary && (
            <div className="border border-emerald-200 rounded-xl p-2.5 bg-emerald-50/40 flex items-center justify-between text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-600" /> Cheapest Offer
                </span>
                <span className="font-semibold text-gray-700">{productOfferDetails.cheapestOfferSummary}</span>
              </div>
            </div>
          )}

          {/* Best Value Offer Summary */}
          {productOfferDetails?.bestValueOfferSummary && (
            <div className="border border-purple-200 rounded-xl p-2.5 bg-purple-50/40 flex items-center justify-between text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-600" /> Best Value Offer
                </span>
                <span className="font-semibold text-gray-700">{productOfferDetails.bestValueOfferSummary}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confidence Assessment Details */}
      {confidenceDetails && (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-1.5">
          <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-600" /> Confidence Assessment
          </span>
          <div className="flex justify-between items-center text-xs text-gray-700 pt-0.5">
            <span>Identity Certainty:</span>
            <span className="font-bold text-gray-900">{Math.round(confidenceDetails.factors.identityCertainty * 100)}%</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-700">
            <span>Data Completeness:</span>
            <span className="font-bold text-gray-900">{Math.round(confidenceDetails.factors.dataCompleteness * 100)}%</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-700">
            <span>Price Freshness:</span>
            <span className="font-bold text-gray-900">{Math.round(confidenceDetails.factors.priceFreshness * 100)}%</span>
          </div>
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

      {/* Direct Merchant Link CTA */}
      {recProduct?.originalUrl && (
        <button
          onClick={() => handleLinkClick(recProduct.originalUrl)}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 mt-1"
        >
          Buy Direct from {recProduct.metadata?.marketplace || "Merchant"}
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
