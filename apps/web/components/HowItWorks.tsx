import { Fragment } from "react";
import { Globe, Cpu, Scale, CheckCircle2, ArrowRight } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      title: "Visit Product",
      description: "Browse any product page on Amazon, Flipkart, or other top retail sites.",
      icon: Globe,
    },
    {
      title: "AI Understands Product",
      description: "Our agent instantly extracts specifications, features, and key details.",
      icon: Cpu,
    },
    {
      title: "Compare Across Websites",
      description: "It cross-checks prices, seller ratings, and shipping options automatically.",
      icon: Scale,
    },
    {
      title: "Best Recommendation",
      description: "Get the absolute best place to buy, saving time and money.",
      icon: CheckCircle2,
    },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 bg-gray-50 border-t border-gray-100 rounded-3xl my-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-gray-900">
          How It Works
        </h2>
        <p className="text-gray-600 text-lg">
          CartIntel automatically guides your shopping journey in four simple steps.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <Fragment key={idx}>
              <div className="w-full bg-white p-6 pt-10 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-lg flex flex-col items-center text-center flex-1 min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-4 flex-shrink-0 flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900 flex-shrink-0">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-[200px]">{step.description}</p>
              </div>
              
              {idx < steps.length - 1 && (
                <div className="my-4 lg:my-0 lg:mx-2 flex items-center justify-center text-blue-600 rotate-90 lg:rotate-0 flex-shrink-0">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
