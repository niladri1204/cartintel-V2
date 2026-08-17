import { Loader2, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  "Understanding product",
  "Searching marketplaces",
  "Comparing prices",
  "Generating recommendation"
];

export function LoadingState() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // We have 2 seconds total (from handleAnalyze timeout), so 500ms per step
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col items-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
      <h3 className="text-sm font-bold text-gray-800 mb-4">
        Scanning product...
      </h3>
      
      <div className="w-full max-w-[200px] flex flex-col gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;


          return (
            <div 
              key={step} 
              className={`flex items-center gap-2 text-xs font-medium transition-opacity duration-300 ${
                isCompleted ? 'text-green-600' : isCurrent ? 'text-gray-900' : 'text-gray-400 opacity-50'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : isCurrent ? (
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
              )}
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}
