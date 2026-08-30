import { Brain, DollarSign, Star, ShoppingCart } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Product Matching",
    description: "Find the same product across different shopping websites accurately.",
  },
  {
    icon: DollarSign,
    title: "Smart Price Comparison",
    description: "Compare prices from relevant marketplaces instantly.",
  },
  {
    icon: Star,
    title: "Review Intelligence",
    description: "AI summarizes thousands of reviews and highlights common issues.",
  },
  {
    icon: ShoppingCart,
    title: "Best Buy Recommendation",
    description: "Get the best buying suggestion based on price, seller trust, and ratings.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-28 mx-auto max-w-7xl px-6 py-20">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-4 text-[#F4EEF3]">
          Why Choose CartIntel?
        </h2>
        <p className="text-[#B9AEB8] text-lg font-light">
          Our advanced browser agent works quietly in the background to elevate your shopping experience.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="w-full bg-[#0D080D]/75 p-6 pt-8 rounded-2xl border border-white/10 shadow-lg shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#C982A7]/35 hover:shadow-xl hover:shadow-black/70 flex flex-col items-center text-center flex-1 min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-xl bg-[#5A254D]/35 border border-[#C982A7]/25 text-[#C982A7] mb-4 flex-shrink-0 flex items-center justify-center shadow-inner shadow-[#8A3C70]/20">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#F4EEF3] flex-shrink-0">{feature.title}</h3>
              <p className="text-[#B9AEB8] text-sm leading-relaxed max-w-[210px] font-light">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}