import React, { useState } from 'react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Track Every Step",
      desc: "Hit 'Start Walk' to track your steps, distance, and calories with GPS precision. We keep your history locally.",
      icon: "fa-person-walking",
      color: "text-brand-400",
      bg: "bg-brand-400/10"
    },
    {
      title: "Meet AI Coach",
      desc: "After each walk, get personalized insights and motivation powered by Gemini AI. Click the robot icon anytime!",
      icon: "fa-robot",
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    {
      title: "Unlock Achievements",
      desc: "Reach milestones to earn unique badges. The AI even generates special badges for unique walking patterns!",
      icon: "fa-medal",
      color: "text-orange-400",
      bg: "bg-orange-400/10"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-dark-card w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl p-8 flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
            <div 
                className="h-full bg-brand-500 transition-all duration-300 ease-out"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
        </div>

        {/* Icon */}
        <div className={`w-24 h-24 rounded-full ${current.bg} flex items-center justify-center mb-6 animate-pulse-slow transition-colors duration-500`}>
             <i className={`fa-solid ${current.icon} text-5xl ${current.color}`}></i>
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight h-8">{current.title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 h-16">
            {current.desc}
        </p>

        {/* Navigation */}
        <div className="w-full flex items-center justify-between mt-auto">
            <button 
                onClick={onClose}
                className="text-slate-500 text-sm font-medium hover:text-white px-4 py-2"
            >
                Skip
            </button>
            
            <div className="flex gap-1">
                {steps.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-white' : 'bg-slate-700'}`}></div>
                ))}
            </div>

            <button 
                onClick={handleNext}
                className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm hover:bg-brand-50 transition-colors shadow-lg active:scale-95"
            >
                {step === steps.length - 1 ? 'Start' : 'Next'}
            </button>
        </div>
      </div>
    </div>
  );
};