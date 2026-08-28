import { useEffect, useState } from "react";
import { Globe, Sparkles, Settings, Info, ShoppingBag, ExternalLink, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import type { ProductDetectionResult } from "../content/types";
import type { ProductIntelligence } from "../intelligence/types";
import { compareProduct, type ComparisonResult } from "../intelligence/orchestrator";
import type { RecommendationResult as DecisionRecommendationResult } from "../intelligence/recommendationTypes";
import { RecommendationPresentation } from "./components/RecommendationPresentation";
import { emitOfferTrace } from "../utils/terminalTrace";

export default function Popup() {
  const [product, setProduct] = useState<ProductDetectionResult | null>(null);
  const [intelligence, setIntelligence] = useState<ProductIntelligence | null>(null);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
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
    setComparisonResult(null);
    setDecisionRecommendation(null);
    try {
      const result = await compareProduct(intelligence);
      console.log("[VisualTrace] popup result received:", result ? result.identity?.products?.length : 0);
      setComparisonResult(result);

      if (result.decisionRecommendation) {
        setDecisionRecommendation(result.decisionRecommendation);
      }
    } catch (err) {
      setComparisonError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsComparing(false);
    }
  };

  const activeTabHostname = activeTabUrl ? new URL(activeTabUrl).hostname.replace('www.', '') : null;

  return (
    <div className="w-[380px] bg-gray-50 text-gray-900 font-sans shadow-2xl rounded-2xl overflow-hidden border border-gray-200/50 flex flex-col max-h-[600px]">
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

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-5 flex flex-col gap-4 min-h-full">
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between transition-shadow hover:shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
              <Globe className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Store</p>
              <h2 className="text-sm font-bold text-gray-800 capitalize truncate max-w-[160px]">
                {product?.hostname || activeTabHostname || 'Detecting...'}
              </h2>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            product 
              ? 'bg-green-50 text-green-700 border border-green-200/60' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              product ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
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

        {decisionRecommendation ? (() => {
          emitOfferTrace("7. Immediately before Popup passes recommendation into RecommendationPresentation", decisionRecommendation.allEligibleOffers || [], true);
          return (
            <RecommendationPresentation
              recommendation={decisionRecommendation}
              getCurrencySymbol={getCurrencySymbol}
            />
          );
        })() : isComparing ? (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-xs font-semibold text-gray-600">Comparing prices across marketplaces...</p>
          </div>
        ) : comparisonError ? (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">Comparison Error</span>
              <span>{comparisonError}</span>
            </div>
          </div>
        ) : comparisonResult ? (
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm text-center shrink-0">
            <h3 className="text-sm font-bold text-gray-800 mb-1">
              No Matching Deals Found
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[250px] mx-auto">
              We couldn't find matching marketplace offers for this product.
            </p>
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
                setDecisionRecommendation(null);
                setComparisonError(null);
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
