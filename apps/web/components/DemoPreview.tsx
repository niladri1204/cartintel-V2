"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ArrowRight, ExternalLink, Sparkles, TrendingDown, Star, Lock, Check, Sparkle, ShoppingBag } from "lucide-react";

export default function DemoPreview() {
  const [urlText, setUrlText] = useState("amazon.in/dp/B0CXMS416P");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnalyzing(true);
      setUrlText("CartIntel analyzing...");

      setTimeout(() => {
        setIsAnalyzing(false);
        setUrlText("amazon.in/dp/B0CXMS416P (Match Found!)");
      }, 2500);
      
    }, 7000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 pt-44 pb-20 bg-white">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 mb-4 select-none">
          <Sparkle className="h-3.5 w-3.5 text-blue-500 fill-blue-500" /> Demo Showcase
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
          See CartIntel in Action
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          From product detection to AI-powered buying recommendations in seconds.
        </p>
      </div>

      {/* Main Browser Window Mockup */}
      <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-gray-200/50">
        {/* Top Browser Header Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3.5 flex items-center gap-4 select-none">
          {/* Traffic Lights */}
          <div className="flex gap-2 flex-shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer block" />
            <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer block" />
            <span className="w-3.5 h-3.5 rounded-full bg-green-400 hover:bg-green-500 transition-colors cursor-pointer block" />
          </div>

          {/* Address/URL Bar */}
          <div className="flex-1 max-w-xl mx-auto bg-white border border-gray-200 rounded-xl py-1.5 px-4 flex items-center justify-between text-xs font-medium transition-all duration-300">
            <div className="flex items-center gap-2">
              <Lock className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-300 ${isAnalyzing ? 'text-blue-500' : 'text-green-600'}`} />
              <span className={`transition-all duration-300 ${isAnalyzing ? 'text-blue-600 font-semibold animate-pulse' : 'text-gray-600 font-normal'}`}>
                {isAnalyzing ? "CartIntel analyzing..." : "amazon.in/product/iphone-16-pro"}
              </span>
            </div>
            {!isAnalyzing && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <Check className="h-2.5 w-2.5 stroke-[3]" /> Product Matched
              </span>
            )}
            {isAnalyzing && (
              <span className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">Scanning</span>
            )}
          </div>

          {/* Window Space Placeholder */}
          <div className="w-16 hidden md:block" />
        </div>

        {/* Browser Body Canvas */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 p-6 sm:p-8 bg-gray-50/40">
          
          {/* LEFT PANEL: Current Product Page (40% space / 5 cols) */}
          <div className="xl:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-300 hover:border-gray-300">
            
            {/* Top Badge */}
            <div className="flex justify-between items-center mb-6">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-violet-50 text-violet-600 border border-violet-100 flex items-center gap-1 select-none">
                <ShoppingBag className="w-3 h-3" /> Current Product
              </span>
              <span className="text-xs text-gray-400">ID: B0CXMS416P</span>
            </div>

            {/* Product Image Panel using Real Phone Graphic */}
            <div className="w-full h-56 rounded-xl overflow-hidden select-none mb-6 relative">
              <img 
                src="/iphone16pro.png" 
                alt="Apple iPhone 16 Pro" 
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Product Meta */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2">
                Apple iPhone 16 Pro 256GB
              </h3>
              
              <div className="flex items-center gap-1.5 mb-6">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-xs text-gray-400 font-semibold">(1,289 reviews)</span>
              </div>

              {/* Price Details */}
              <div className="border-t border-gray-100 pt-5">
                <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Current Retail Price</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">₹54,999</span>
                  <span className="text-sm text-gray-400 line-through">₹64,999</span>
                </div>
                <div className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> In Stock & ready to ship
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: CartIntel AI Interface (60% space / 7 cols) */}
          <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* STACK 1: Card 1 (Identified) & Card 2 (Best Prices) */}
            <div className="flex flex-col gap-6">
              
              {/* Card 1: Product Identified */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition-all duration-300 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Product Identified</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 select-none">
                    Confidence: 98%
                  </span>
                </div>
              </div>

              {/* Card 2: Best Prices with 3 Columns (Store, Price, Status) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition-all duration-300 flex-1 flex flex-col justify-start">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Market Comparison</h4>
                
                <div className="flex flex-col gap-2.5">
                  {/* Table Header */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 pb-1 border-b border-gray-100">
                    <span className="w-1/3">Store</span>
                    <span className="w-1/3 text-right">Price</span>
                    <span className="w-1/3 text-right">Status</span>
                  </div>

                  {/* Amazon */}
                  <div className="flex items-center justify-between text-sm py-1 px-1 border-b border-gray-50">
                    <span className="w-1/3 text-gray-600 font-medium">Amazon</span>
                    <span className="w-1/3 text-right font-semibold text-gray-900">₹54,999</span>
                    <span className="w-1/3 text-right text-gray-400">-</span>
                  </div>

                  {/* Flipkart (Best Deal) */}
                  <div className="flex items-center justify-between text-sm py-1.5 px-3.5 bg-green-50/50 border border-green-150 rounded-xl">
                    <span className="w-1/3 text-gray-900 font-bold">Flipkart</span>
                    <span className="w-1/3 text-right font-extrabold text-green-700">₹52,499</span>
                    <span className="w-1/3 text-right text-xs font-bold text-green-600">✓ Best Deal</span>
                  </div>

                  {/* Croma */}
                  <div className="flex items-center justify-between text-sm py-1 px-1 border-b border-gray-50">
                    <span className="w-1/3 text-gray-600 font-medium">Croma</span>
                    <span className="w-1/3 text-right font-semibold text-gray-900">₹53,490</span>
                    <span className="w-1/3 text-right text-gray-400">-</span>
                  </div>

                  {/* Reliance */}
                  <div className="flex items-center justify-between text-sm py-1 px-1">
                    <span className="w-1/3 text-gray-600 font-medium">Reliance</span>
                    <span className="w-1/3 text-right font-semibold text-gray-900">₹53,999</span>
                    <span className="w-1/3 text-right text-gray-400">-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STACK 2: Card 3 (AI Insights) & Card 4 (AI Recommendation - Height Increased) */}
            <div className="flex flex-col gap-6">
              
              {/* Card 3: AI Insights */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition-all duration-300 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">AI Insights</h4>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-2 text-xs text-gray-700">
                      <Check className="h-3.5 w-3.5 text-blue-600 mt-0.5 stroke-[2.5]" />
                      <span>Better seller reputation on Flipkart</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-700">
                      <Check className="h-3.5 w-3.5 text-blue-600 mt-0.5 stroke-[2.5]" />
                      <span>Faster delivery options verified</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-700">
                      <Check className="h-3.5 w-3.5 text-blue-600 mt-0.5 stroke-[2.5]" />
                      <span>Higher actual customer ratings</span>
                    </div>
                  </div>
                </div>

                {/* Savings Section */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-semibold">Estimated Savings</span>
                  <span className="text-lg font-black text-green-600 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 stroke-[2.5]" /> ₹2,500
                  </span>
                </div>
              </div>

              {/* Card 4: AI Recommendation */}
              <div className="bg-blue-600 text-white rounded-2xl p-6 py-9 shadow-[0_8px_32px_rgba(37,99,235,0.45)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.55)] relative overflow-hidden hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[240px]">
                {/* Subtle radial glow top-right */}
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />

                <div>
                  <div className="flex items-center gap-1.5 mb-3.5">
                    <Sparkles className="h-4 w-4 text-blue-200 fill-blue-200 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">AI Recommendation</span>
                  </div>
                  
                  <h5 className="text-xl font-extrabold mb-2">Buy from Flipkart</h5>
                  <p className="text-xs text-blue-100 leading-relaxed mb-5">
                    Lowest verified price, trusted seller, faster delivery.
                  </p>
                </div>

                <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-blue-700 rounded-xl text-xs font-bold shadow-md hover:bg-blue-50 transition-colors">
                  Go to Flipkart <ExternalLink className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
