"use client";

import { useState, useEffect } from "react";
import { Check, Sparkles, TrendingDown, Star, Lock, Sparkle, ShoppingBag, ExternalLink } from "lucide-react";

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
    <section id="demo" className="scroll-mt-28 mx-auto max-w-7xl px-6 pt-24 pb-20">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#5A254D]/25 text-[#C982A7] border border-[#C982A7]/25 mb-4 select-none backdrop-blur-md">
          <Sparkle className="h-3.5 w-3.5 text-[#C982A7] fill-[#C982A7]" /> Demo Showcase
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4EEF3] mb-4">
          See CartIntel in Action
        </h2>
        <p className="text-[#B9AEB8] text-lg leading-relaxed font-light">
          From product detection to AI-powered buying recommendations in seconds.
        </p>
      </div>

      {/* Main Browser Window Mockup */}
      <div className="w-full rounded-2xl border border-white/10 bg-[#0D080D]/80 shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:border-[#C982A7]/25">
        {/* Top Browser Header Bar */}
        <div className="bg-[#151016]/90 border-b border-white/10 px-4 py-3.5 flex items-center gap-4 select-none">
          {/* Traffic Lights */}
          <div className="flex gap-2 flex-shrink-0">
            <span className="w-3 h-3 rounded-full bg-red-400/80 hover:bg-red-400 transition-colors cursor-pointer block" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-400 transition-colors cursor-pointer block" />
            <span className="w-3 h-3 rounded-full bg-green-400/80 hover:bg-green-400 transition-colors cursor-pointer block" />
          </div>

          {/* Address/URL Bar */}
          <div className="flex-1 max-w-xl mx-auto bg-[#070507]/90 border border-white/10 rounded-xl py-1.5 px-4 flex items-center justify-between text-xs font-medium transition-all duration-300">
            <div className="flex items-center gap-2">
              <Lock className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-300 ${isAnalyzing ? 'text-[#C982A7]' : 'text-emerald-400'}`} />
              <span className={`transition-all duration-300 ${isAnalyzing ? 'text-[#C982A7] font-semibold animate-pulse' : 'text-[#B9AEB8] font-normal'}`}>
                {isAnalyzing ? "CartIntel analyzing..." : "amazon.in/product/iphone-16-pro"}
              </span>
            </div>
            {!isAnalyzing && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C982A7] bg-[#5A254D]/35 border border-[#C982A7]/30 px-2 py-0.5 rounded-full">
                <Check className="h-2.5 w-2.5 stroke-[3]" /> Product Matched
              </span>
            )}
            {isAnalyzing && (
              <span className="text-[10px] text-[#C982A7] font-semibold uppercase tracking-wider bg-[#5A254D]/30 px-2 py-0.5 rounded-md">Scanning</span>
            )}
          </div>

          {/* Window Space Placeholder */}
          <div className="w-16 hidden md:block" />
        </div>

        {/* Browser Body Canvas */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 p-6 sm:p-8 bg-[#070507]/40">
          
          {/* LEFT PANEL: Current Product Page (40% space / 5 cols) */}
          <div className="xl:col-span-5 bg-[#151016]/75 rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-300 hover:border-[#C982A7]/30 backdrop-blur-xl">
            
            {/* Top Badge */}
            <div className="flex justify-between items-center mb-6">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#5A254D]/30 text-[#C982A7] border border-[#C982A7]/20 flex items-center gap-1 select-none">
                <ShoppingBag className="w-3 h-3" /> Current Product
              </span>
              <span className="text-xs text-[#817580]">ID: B0CXMS416P</span>
            </div>

            {/* Product Image Panel using Real Phone Graphic */}
            <div className="w-full h-56 rounded-xl overflow-hidden select-none mb-6 relative bg-[#070507]/50 border border-white/5 flex items-center justify-center">
              <img 
                src="/iphone16pro.png" 
                alt="Apple iPhone 16 Pro" 
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Product Meta */}
            <div>
              <h3 className="text-xl font-bold text-[#F4EEF3] leading-tight mb-2">
                Apple iPhone 16 Pro 256GB
              </h3>
              
              <div className="flex items-center gap-1.5 mb-6">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#C982A7] text-[#C982A7]" />
                  ))}
                </div>
                <span className="text-xs text-[#817580] font-semibold">(1,289 reviews)</span>
              </div>

              {/* Price Details */}
              <div className="border-t border-white/10 pt-5">
                <div className="text-[11px] text-[#817580] font-semibold uppercase tracking-wider mb-1">Current Retail Price</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#F4EEF3]">₹54,999</span>
                  <span className="text-sm text-[#817580] line-through">₹64,999</span>
                </div>
                <div className="text-xs text-[#C982A7] font-semibold mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C982A7] animate-pulse" /> In Stock & ready to ship
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: CartIntel AI Interface (60% space / 7 cols) */}
          <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* STACK 1: Card 1 (Identified) & Card 2 (Best Prices) */}
            <div className="flex flex-col gap-6">
              
              {/* Card 1: Product Identified */}
              <div className="bg-[#151016]/75 rounded-2xl border border-white/10 p-5 shadow-sm hover:border-[#C982A7]/30 transition-all duration-300 flex flex-col justify-center backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#5A254D]/40 text-[#C982A7] border border-[#C982A7]/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold text-[#F4EEF3]">Product Identified</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#5A254D]/30 text-[#C982A7] border border-[#C982A7]/20 select-none">
                    Confidence: 98%
                  </span>
                </div>
              </div>

              {/* Card 2: Best Prices with 3 Columns (Store, Price, Status) */}
              <div className="bg-[#151016]/75 rounded-2xl border border-white/10 p-5 shadow-sm hover:border-[#C982A7]/30 transition-all duration-300 flex-1 flex flex-col justify-start backdrop-blur-xl">
                <h4 className="text-xs font-bold text-[#817580] uppercase tracking-wider mb-3">Market Comparison</h4>
                
                <div className="flex flex-col gap-2.5">
                  {/* Table Header */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#817580] uppercase tracking-wider px-1 pb-1 border-b border-white/10">
                    <span className="w-1/3">Store</span>
                    <span className="w-1/3 text-right">Price</span>
                    <span className="w-1/3 text-right">Status</span>
                  </div>

                  {/* Amazon */}
                  <div className="flex items-center justify-between text-sm py-1 px-1 border-b border-white/5">
                    <span className="w-1/3 text-[#B9AEB8] font-medium">Amazon</span>
                    <span className="w-1/3 text-right font-semibold text-[#F4EEF3]">₹54,999</span>
                    <span className="w-1/3 text-right text-[#817580]">-</span>
                  </div>

                  {/* Flipkart (Best Deal) */}
                  <div className="flex items-center justify-between text-sm py-1.5 px-3.5 bg-[#5A254D]/35 border border-[#C982A7]/40 rounded-xl shadow-md shadow-[#5A254D]/20">
                    <span className="w-1/3 text-[#F4EEF3] font-bold">Flipkart</span>
                    <span className="w-1/3 text-right font-extrabold text-[#C982A7]">₹52,499</span>
                    <span className="w-1/3 text-right text-xs font-bold text-[#C982A7]">✓ Best Deal</span>
                  </div>

                  {/* Croma */}
                  <div className="flex items-center justify-between text-sm py-1 px-1 border-b border-white/5">
                    <span className="w-1/3 text-[#B9AEB8] font-medium">Croma</span>
                    <span className="w-1/3 text-right font-semibold text-[#F4EEF3]">₹53,490</span>
                    <span className="w-1/3 text-right text-[#817580]">-</span>
                  </div>

                  {/* Reliance */}
                  <div className="flex items-center justify-between text-sm py-1 px-1">
                    <span className="w-1/3 text-[#B9AEB8] font-medium">Reliance</span>
                    <span className="w-1/3 text-right font-semibold text-[#F4EEF3]">₹53,999</span>
                    <span className="w-1/3 text-right text-[#817580]">-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STACK 2: Card 3 (AI Insights) & Card 4 (AI Recommendation) */}
            <div className="flex flex-col gap-6">
              
              {/* Card 3: AI Insights */}
              <div className="bg-[#151016]/75 rounded-2xl border border-white/10 p-5 shadow-sm hover:border-[#C982A7]/30 transition-all duration-300 flex-1 flex flex-col justify-between backdrop-blur-xl">
                <div>
                  <h4 className="text-xs font-bold text-[#817580] uppercase tracking-wider mb-4">AI Insights</h4>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-2 text-xs text-[#B9AEB8]">
                      <Check className="h-3.5 w-3.5 text-[#C982A7] mt-0.5 stroke-[2.5]" />
                      <span>Better seller reputation on Flipkart</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-[#B9AEB8]">
                      <Check className="h-3.5 w-3.5 text-[#C982A7] mt-0.5 stroke-[2.5]" />
                      <span>Faster delivery options verified</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-[#B9AEB8]">
                      <Check className="h-3.5 w-3.5 text-[#C982A7] mt-0.5 stroke-[2.5]" />
                      <span>Higher actual customer ratings</span>
                    </div>
                  </div>
                </div>

                {/* Savings Section */}
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-[#817580] font-semibold">Estimated Savings</span>
                  <span className="text-lg font-black text-[#C982A7] flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 stroke-[2.5]" /> ₹2,500
                  </span>
                </div>
              </div>

              {/* Card 4: AI Recommendation */}
              <div className="bg-gradient-to-br from-[#5A254D] via-[#3D1834] to-[#151016] text-white rounded-2xl p-6 py-9 border border-[#C982A7]/35 shadow-[0_8px_32px_rgba(90,37,77,0.45)] hover:shadow-[0_12px_40px_rgba(138,60,112,0.45)] relative overflow-hidden hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[240px]">
                {/* Subtle radial glow top-right */}
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#C982A7]/15 blur-2xl pointer-events-none" />

                <div>
                  <div className="flex items-center gap-1.5 mb-3.5">
                    <Sparkles className="h-4 w-4 text-[#C982A7] fill-[#C982A7] animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#C982A7]">AI Recommendation</span>
                  </div>
                  
                  <h5 className="text-xl font-extrabold mb-2 text-[#F4EEF3]">Buy from Flipkart</h5>
                  <p className="text-xs text-[#B9AEB8] leading-relaxed mb-5">
                    Lowest verified price, trusted seller, faster delivery.
                  </p>
                </div>

                <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#F4EEF3] text-[#070507] rounded-xl text-xs font-bold shadow-md hover:bg-white transition-colors">
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
