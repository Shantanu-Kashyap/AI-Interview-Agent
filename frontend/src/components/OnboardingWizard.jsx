import React, { useMemo, useState } from "react";
import { BsCoin, BsMic, BsFileEarmarkBarGraph } from "react-icons/bs";

const steps = [
  {
    title: "Understand Credits",
    description:
      "Each interview uses credits. Keep an eye on your balance, and top up anytime from pricing.",
    points: ["Interview generation consumes credits", "Track credits in top navigation"],
    icon: <BsCoin size={18} />,
  },
  {
    title: "Pick Right Interview Mode",
    description:
      "Choose Technical or HR mode based on your immediate goal. You can also upload resume for richer questions.",
    points: ["Technical mode for role depth", "HR mode for communication practice"],
    icon: <BsMic size={18} />,
  },
  {
    title: "Know Your Report",
    description:
      "After the interview, you get question-wise feedback, scoring breakdown, and a downloadable PDF report.",
    points: ["Confidence, communication, correctness", "Use report to plan next practice"],
    icon: <BsFileEarmarkBarGraph size={18} />,
  },
];

const OnboardingWizard = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const active = useMemo(() => steps[currentStep], [currentStep]);

  const closeWizard = () => {
    window.localStorage.setItem("interview-onboarding-v1", "done");
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm" style={{ zIndex: 1100 }}>
      <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">Getting Started</p>
          <button onClick={closeWizard} className="text-sm text-gray-500 hover:text-gray-700">
            Skip
          </button>
        </div>

        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          {active.icon}
        </div>

        <h3 className="text-2xl font-semibold text-gray-800">{active.title}</h3>
        <p className="mt-3 text-gray-600">{active.description}</p>

        <ul className="mt-4 space-y-2">
          {active.points.map((point) => (
            <li key={point} className="text-sm text-gray-500">
              • {point}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center gap-2">
          {steps.map((_, index) => (
            <span
              key={`step-${index}`}
              className={`h-2 rounded-full transition-all ${
                currentStep === index ? "w-8 bg-emerald-600" : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
          >
            Back
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={closeWizard}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              Start Interview
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
              className="rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
