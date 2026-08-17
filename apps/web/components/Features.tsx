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
    <section id="features" className="mx-auto max-w-7xl px-6 py-16 bg-white">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-gray-900">
          Why Choose CartIntel?
        </h2>
        <p className="text-gray-600 text-lg">
          Our advanced browser agent works quietly in the background to elevate your shopping experience.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="w-full bg-white p-6 pt-8 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-lg flex flex-col items-center text-center flex-1 min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-4 flex-shrink-0 flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900 flex-shrink-0">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-[200px]">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}