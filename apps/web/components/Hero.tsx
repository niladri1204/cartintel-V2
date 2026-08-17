import { ArrowRight, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center pt-36 overflow-hidden">
      {/* Decorative gradient backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs text-blue-600 font-medium mb-8">
          <Sparkles className="h-3.5 w-3.5" />
          The future of online shopping is here
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-black mb-6 leading-tight">
          Your AI{" "}
          <span className="text-blue-600">
            Shopping Copilot
          </span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed">
          Find the best price, understand reviews, and discover better alternatives across the web.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button className="flex items-center gap-2 rounded-xl bg-black px-8 py-4 font-semibold text-white transition-all hover:bg-gray-800">
            Install Extension
            <ArrowRight className="h-4 w-4" />
          </button>

          <button className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-8 py-4 font-semibold text-black transition-all">
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  );
}
