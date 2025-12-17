import React, { useState } from 'react';
import { generateWeeklyPlan } from '../services/geminiService';
import { WeeklyPlan } from '../types';

interface WorkoutPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePlan: (plan: WeeklyPlan) => void;
}

const GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: 'fa-fire', color: 'from-orange-500 to-red-500', desc: 'Burn calories efficiently' },
  { id: 'stamina', label: 'Build Stamina', icon: 'fa-heart-pulse', color: 'from-blue-500 to-cyan-500', desc: 'Go further, not faster' },
  { id: 'stress', label: 'Stress Relief', icon: 'fa-spa', color: 'from-emerald-500 to-teal-500', desc: 'Mindful walking' },
  { id: 'speed', label: 'Increase Speed', icon: 'fa-gauge-high', color: 'from-purple-500 to-indigo-500', desc: 'Power walking focus' }
];

const INTENSITIES = [
  { id: 'Low', label: 'Beginner', desc: 'Easy pace, focus on habit.', color: 'border-green-500/50 bg-green-500/10 text-green-400' },
  { id: 'Medium', label: 'Intermediate', desc: 'Mix of brisk & steady walks.', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' },
  { id: 'High', label: 'Advanced', desc: 'High intensity intervals.', color: 'border-red-500/50 bg-red-500/10 text-red-400' }
];

export const WorkoutPlannerModal: React.FC<WorkoutPlannerModalProps> = ({ isOpen, onClose, onSavePlan }) => {
  const [step, setStep] = useState<'goal' | 'intensity' | 'loading' | 'result'>('goal');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedIntensity, setSelectedIntensity] = useState('Medium');
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);

  const handleGoalSelect = (goalLabel: string) => {
      setSelectedGoal(goalLabel);
      setStep('intensity');
  };

  const handleGenerate = async (intensity: string) => {
    setSelectedIntensity(intensity);
    setStep('loading');
    try {
        const newPlan = await generateWeeklyPlan(selectedGoal, intensity);
        setPlan(newPlan);
        setStep('result');
    } catch (e) {
        alert("Coach is on a chai break. Try again later!");
        setStep('goal');
    }
  };

  const handleSave = () => {
      if (plan) {
          onSavePlan(plan);
          onClose();
          // Reset for next time
          setTimeout(() => {
              setStep('goal');
              setPlan(null);
          }, 500);
      }
  };

  const getIntensityColor = (level: string) => {
      switch(level) {
          case 'High': return 'text-red-400 border-red-500/30 bg-red-500/10';
          case 'Medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
          default: return 'text-green-400 border-green-500/30 bg-green-500/10';
      }
  };

  const getIconForType = (type: string) => {
      switch(type) {
          case 'Interval': return 'fa-stopwatch-20';
          case 'Endurance': return 'fa-route';
          case 'Recovery': return 'fa-leaf';
          default: return 'fa-person-walking';
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden relative">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-white font-bold text-lg">Smart Planner</h2>
            <div className="flex items-center gap-2">
                 <div className={`h-1.5 w-1.5 rounded-full ${step === 'goal' ? 'bg-brand-500' : 'bg-slate-600'}`}></div>
                 <div className={`h-1.5 w-1.5 rounded-full ${step === 'intensity' ? 'bg-brand-500' : 'bg-slate-600'}`}></div>
                 <div className={`h-1.5 w-1.5 rounded-full ${step === 'result' ? 'bg-brand-500' : 'bg-slate-600'}`}></div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            
            {step === 'goal' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-2">What's your focus?</h3>
                        <p className="text-slate-400 text-sm">Select a goal to get started.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {GOALS.map((goal) => (
                            <button
                                key={goal.id}
                                onClick={() => handleGoalSelect(goal.label)}
                                className="relative group overflow-hidden rounded-2xl p-4 h-36 flex flex-col items-center justify-center border border-slate-700 hover:border-slate-500 transition-all active:scale-95 text-center"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${goal.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                                <i className={`fa-solid ${goal.icon} text-3xl mb-3 bg-gradient-to-br ${goal.color} bg-clip-text text-transparent`}></i>
                                <span className="font-bold text-slate-200 text-sm mb-1">{goal.label}</span>
                                <span className="text-[10px] text-slate-500 leading-tight">{goal.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 'intensity' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setStep('goal')} className="text-slate-500 hover:text-white transition-colors">
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        <h3 className="text-xl font-bold text-white">Select Intensity</h3>
                    </div>
                    
                    <div className="space-y-3">
                        {INTENSITIES.map((int) => (
                            <button
                                key={int.id}
                                onClick={() => handleGenerate(int.id)}
                                className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all hover:brightness-110 active:scale-95 text-left ${int.color}`}
                            >
                                <div>
                                    <span className="block font-bold text-lg">{int.label}</span>
                                    <span className="text-xs opacity-80">{int.desc}</span>
                                </div>
                                <i className="fa-solid fa-chevron-right opacity-50 group-hover:translate-x-1 transition-transform"></i>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 'loading' && (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <i className="fa-solid fa-wand-magic-sparkles text-brand-400 text-xl animate-pulse"></i>
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-bold text-lg mb-1">Coach is Thinking...</h3>
                        <p className="text-slate-500 text-sm">Designing your {selectedGoal.toLowerCase()} plan</p>
                    </div>
                </div>
            )}

            {step === 'result' && plan && (
                <div className="space-y-4 animate-message-pop">
                    <div className="bg-gradient-to-r from-brand-900/40 to-slate-800 p-4 rounded-xl border border-brand-500/20 mb-2 flex justify-between items-center">
                        <div>
                            <span className="text-[10px] text-brand-400 uppercase tracking-widest font-bold">Your Plan</span>
                            <h3 className="text-white font-bold text-lg">{plan.goal}</h3>
                        </div>
                        <button onClick={() => setStep('goal')} className="text-xs text-slate-400 hover:text-white">
                            Restart
                        </button>
                    </div>
                    
                    {/* Visual Progress Bar (0/7 Days) */}
                    <div className="mb-4 px-1">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Plan Duration</span>
                            <span className="text-xs text-white font-mono font-bold">0 / 7 Days</span>
                        </div>
                        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative border border-slate-700 shadow-inner">
                            {/* Grid lines for days */}
                            <div className="absolute inset-0 flex z-10">
                                {[...Array(7)].map((_, i) => (
                                    <div key={i} className="flex-1 border-r border-slate-900/30 last:border-0"></div>
                                ))}
                            </div>
                            {/* Start Indicator - Tiny sliver to show start color */}
                            <div className="h-full bg-gradient-to-r from-apna-orange to-brand-500 w-[2%] relative">
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_10px_white]"></div>
                            </div>
                        </div>
                        <p className="text-[10px] text-brand-400 mt-2 text-center font-medium opacity-90">
                            <i className="fa-solid fa-flag-checkered mr-1"></i>
                            Ready to start your 7-day journey?
                        </p>
                    </div>

                    <div className="space-y-3">
                        {plan.schedule.map((day, idx) => (
                            <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex gap-4 hover:bg-slate-800/80 transition-colors">
                                <div className="flex flex-col items-center justify-center min-w-[2.5rem] border-r border-slate-700 pr-3">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">{day.day}</span>
                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center mt-1 text-slate-300">
                                        <i className={`fa-solid ${getIconForType(day.type)} text-xs`}></i>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className="text-slate-200 font-bold text-sm truncate">{day.title}</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-1 leading-snug line-clamp-2">{day.description}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <span className={`px-1 rounded ${getIntensityColor(day.intensity)}`}>{day.intensity}</span>
                                        <span>• {day.durationMinutes} min</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 sticky bottom-0 bg-dark-card pb-2">
                         <button 
                            onClick={handleSave}
                            className="w-full bg-apna-orange hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                         >
                            <i className="fa-solid fa-check"></i> Accept Plan
                         </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};