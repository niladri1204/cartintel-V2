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
    <section id="how-it-works" className="scroll-mt-28 mx-auto max-w-7xl px-6 py-24 bg-[#0D080D]/65 border border-white/10 rounded-3xl my-16 backdrop-blur-xl shadow-2xl shadow-black/60">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-4 text-[#F4EEF3]">
          How It Works
        </h2>
        <p className="text-[#B9AEB8] text-lg font-light">
          CartIntel automatically guides your shopping journey in four simple steps.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <Fragment key={idx}>
              <div className="w-full bg-[#151016]/80 p-6 pt-10 rounded-2xl border border-white/10 shadow-lg shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#C982A7]/35 hover:shadow-xl hover:shadow-black/70 flex flex-col items-center text-center flex-1 min-h-[220px]">
                <div className="w-12 h-12 rounded-xl bg-[#5A254D]/35 border border-[#C982A7]/25 text-[#C982A7] mb-4 flex-shrink-0 flex items-center justify-center shadow-inner shadow-[#8A3C70]/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[#F4EEF3] flex-shrink-0">{step.title}</h3>
                <p className="text-[#B9AEB8] text-sm leading-relaxed max-w-[210px] font-light">{step.description}</p>
              </div>
              
              {idx < steps.length - 1 && (
                <div className="my-4 lg:my-0 lg:mx-2 flex items-center justify-center text-[#C982A7]/60 rotate-90 lg:rotate-0 flex-shrink-0">
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
