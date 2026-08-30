import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { ChromeIcon } from "./icons/ChromeIcon";

export default function Hero() {
  return (
    <section id="hero" className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 text-center pt-36 pb-16 overflow-hidden">
      {/* Subtle atmospheric glow behind hero */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[450px] bg-gradient-to-tr from-[#5A254D]/25 to-[#8A3C70]/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C982A7]/25 bg-[#5A254D]/20 text-xs text-[#C982A7] font-medium mb-8 backdrop-blur-md shadow-inner shadow-[#8A3C70]/15">
          <Sparkles className="h-3.5 w-3.5 text-[#C982A7]" />
          The future of online shopping is here
        </div>

        <h1 className="font-display text-5xl sm:text-7xl font-semibold tracking-tight text-[#F4EEF3] mb-6 leading-[1.12]">
          Your AI{" "}
          <span className="italic font-normal bg-gradient-to-r from-[#C982A7] via-[#F4EEF3] to-[#8A3C70] bg-clip-text text-transparent">
            Shopping Copilot
          </span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-[#B9AEB8] mb-10 leading-relaxed font-light">
          Find the best price, understand reviews, and discover better alternatives across the web.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-14">
          <a
            href="#install"
            className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#5A254D] to-[#8A3C70] border border-[#C982A7]/30 px-8 py-4 font-medium text-[#F4EEF3] shadow-xl shadow-[#8A3C70]/25 transition-all duration-200 hover:from-[#6c2c5c] hover:to-[#9c4580] hover:scale-[1.02] active:scale-[0.98]"
          >
            <ChromeIcon className="h-4 w-4 text-[#C982A7]" />
            <span>Add to Chrome</span>
            <ArrowRight className="h-4 w-4" />
          </a>

          <a
            href="#how-it-works"
            className="rounded-xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 px-8 py-4 font-medium text-[#F4EEF3] backdrop-blur-md transition-all duration-200"
          >
            How It Works
          </a>
        </div>

        {/* Trust Information Banner */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-[#817580] pt-6 border-t border-white/10 w-full max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C982A7]" />
            <span>Works on Amazon, Flipkart, Myntra, Croma & 50+ stores</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#C982A7]" />
            <span>100% Free & Privacy Focused</span>
          </div>
        </div>
      </div>
    </section>
  );
}
