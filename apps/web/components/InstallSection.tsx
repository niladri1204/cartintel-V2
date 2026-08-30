import { ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { ChromeIcon } from "./icons/ChromeIcon";

export default function InstallSection() {
  return (
    <section id="install" className="scroll-mt-28 mx-auto max-w-7xl px-6 py-20">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151016]/95 via-[#0D080D]/90 to-[#070507]/95 p-8 sm:p-14 text-center backdrop-blur-2xl shadow-2xl shadow-black/80">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-[#5A254D]/30 to-[#8A3C70]/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#5A254D]/25 text-[#C982A7] border border-[#C982A7]/25 mb-6 select-none backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#C982A7] fill-[#C982A7]" /> Get Started in Seconds
          </span>

          <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[#F4EEF3] mb-6 leading-tight">
            Ready to Shop Smarter with CartIntel?
          </h2>

          <p className="text-lg text-[#B9AEB8] mb-10 max-w-xl font-light leading-relaxed">
            Install the extension once. Experience automatic price comparisons and AI recommendations everywhere you shop.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-12">
            <a
              href="#install"
              className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#5A254D] to-[#8A3C70] border border-[#C982A7]/35 px-8 py-4 font-medium text-[#F4EEF3] shadow-xl shadow-[#8A3C70]/30 transition-all duration-200 hover:from-[#6c2c5c] hover:to-[#9c4580] hover:scale-[1.02] active:scale-[0.98]"
            >
              <ChromeIcon className="h-5 w-5 text-[#C982A7]" />
              <span>Add to Chrome — Free</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-white/10 w-full text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#5A254D]/30 border border-[#C982A7]/20 flex items-center justify-center flex-shrink-0 text-[#C982A7]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#F4EEF3]">Privacy First</h4>
                <p className="text-[11px] text-[#817580]">No tracking or data reselling</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#5A254D]/30 border border-[#C982A7]/20 flex items-center justify-center flex-shrink-0 text-[#C982A7]">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#F4EEF3]">Zero Overhead</h4>
                <p className="text-[11px] text-[#817580]">Lightweight & battery friendly</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#5A254D]/30 border border-[#C982A7]/20 flex items-center justify-center flex-shrink-0 text-[#C982A7]">
                <ChromeIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#F4EEF3]">Manifest V3</h4>
                <p className="text-[11px] text-[#817580]">Fast, modern Chrome extension</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
