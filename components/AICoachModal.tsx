
import React, { useState, useEffect, useRef } from 'react';
import { WalkSession, AIInsight, UserProfile, UserSettings } from '../types';
import { getWalkingInsight, chatWithCoach, getUsageStatus, UsageStatus, synthesizeSpeech } from '../services/geminiService';
import { RouteMap } from './RouteMap';

interface AICoachModalProps {
  session: WalkSession | null;
  isOpen: boolean;
  onClose: () => void;
  isGuest: boolean;
  profile: UserProfile; 
  settings: UserSettings;
  onLoginRequest: () => void;
  onShareStats: (session: WalkSession) => void;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: string;
    audioUrl?: string;
}

const SUGGESTIONS = [
  "Aaj ka target kya hai? 🎯",
  "Biryani khayi, ab kya? 🥘",
  "Thoda motivation de do! 💪",
  "Weight loss tips batao ⚖️"
];

export const AICoachModal: React.FC<AICoachModalProps> = ({ session, isOpen, onClose, isGuest, profile, settings, onLoginRequest, onShareStats }) => {
  const [activeTab, setActiveTab] = useState<'insight' | 'chat'>('insight');
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [usage, setUsage] = useState<UsageStatus>(getUsageStatus());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const firstName = profile.name ? profile.name.split(' ')[0] : 'Walker';

  useEffect(() => {
    if (isOpen) {
        setUsage(getUsageStatus());
    }
  }, [isOpen, messages.length]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages, chatLoading, activeTab]);

  useEffect(() => {
    if (isOpen && session && !insight && !isGuest && usage.allowed) {
      setLoading(true);
      getWalkingInsight(session)
        .then((data) => {
            setInsight(data);
            if (settings.coachVoiceEnabled) {
                synthesizeSpeech(data.summary);
            }
        })
        .catch((err) => {
            if (err.message === "LIMIT_REACHED") setUsage(getUsageStatus());
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, session, isGuest, usage.allowed]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || chatLoading) return;
    
    if (!getUsageStatus().allowed) {
        setUsage(getUsageStatus());
        return;
    }

    setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: textToSend, timestamp: time }]);
    setChatLoading(true);
    
    try {
        const response = await chatWithCoach(messages.map(m => ({ role: m.role, text: m.text })), textToSend);
        if (response === "REACHED_LIMIT") {
            setUsage(getUsageStatus());
        } else {
            setMessages(prev => [...prev, { role: 'model', text: response, timestamp: time }]);
            if (settings.coachVoiceEnabled) {
                synthesizeSpeech(response);
            }
        }
    } catch (err) {
        setMessages(prev => [...prev, { role: 'model', text: "Arre yaar, retry karo!", timestamp: time }]);
    } finally {
        setChatLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] w-full max-w-lg rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl flex flex-col h-[85vh] relative animate-message-pop">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-lg border border-white/10">
                <i className="fa-solid fa-robot"></i>
            </div>
            <div>
                <h2 className="text-white font-black text-sm uppercase tracking-widest italic">Apna Coach</h2>
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${usage.allowed ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{usage.allowed ? 'Available' : 'Chai Break'}</p>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700"><i className="fa-solid fa-xmark"></i></button>
        </div>

        {!usage.allowed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-fade-in">
                <div className="w-24 h-24 bg-orange-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-orange-500/20 shadow-2xl relative">
                    <i className="fa-solid fa-mug-hot text-4xl text-orange-500"></i>
                    <div className="absolute -top-2 -right-2 bg-slate-900 px-2 py-1 rounded-lg border border-orange-500/50 text-[10px] font-black text-orange-400 uppercase">Limit Hit</div>
                </div>
                <h3 className="text-white font-black text-2xl italic tracking-tighter uppercase mb-2">Coach on Chai Break!</h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed mb-8">
                    Arre Boss! Aaj bahut batien ho gayi. Coach thoda rest kar raha hai. 
                    <span className="text-orange-400 font-bold block mt-2">Will be back in {usage.resetInMinutes} mins!</span>
                </p>
                <button onClick={onClose} className="bg-slate-800 text-white font-black px-8 py-3 rounded-2xl border border-slate-700 hover:bg-slate-700 transition-all uppercase text-[10px] tracking-widest">Theek Hai, Boss</button>
            </div>
        ) : isGuest ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <i className="fa-solid fa-lock text-5xl text-slate-700 mb-6"></i>
                <h3 className="text-white font-black text-xl italic uppercase">Login to Unlock</h3>
                <p className="text-slate-500 text-xs mt-2 mb-8">Sign in with Google to use the AI Coach and keep your history.</p>
                <button onClick={() => { onClose(); onLoginRequest(); }} className="bg-brand-600 text-white font-black px-10 py-4 rounded-3xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-[10px]">Continue with Google</button>
            </div>
        ) : (
            <>
                <div className="flex border-b border-slate-700 shrink-0 bg-slate-900/30 p-1">
                    <button onClick={() => setActiveTab('insight')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${activeTab === 'insight' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Insights</button>
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${activeTab === 'chat' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Chat</button>
                </div>
                
                <div className="flex-1 overflow-hidden relative bg-slate-950/20">
                    {activeTab === 'insight' ? (
                        <div className="h-full overflow-y-auto p-6 space-y-6 no-scrollbar pb-20">
                            {session && (
                                <button onClick={() => onShareStats(session)} className="w-full bg-slate-800 border border-slate-700 text-slate-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[4px] hover:text-white transition-all flex items-center justify-center gap-2"><i className="fa-solid fa-share-nodes"></i> Export Achievement</button>
                            )}
                            
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Analyzing signature...</p>
                                </div>
                            ) : insight ? (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
                                        <p className="text-brand-400 text-[10px] font-black uppercase tracking-widest mb-3 italic">Coach's Verdict</p>
                                        <p className="text-white text-lg font-medium leading-relaxed italic">"{insight.summary}"</p>
                                    </div>
                                    <div className="bg-orange-500/5 p-6 rounded-3xl border border-orange-500/20">
                                        <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest mb-3 italic">Today's Motivation</p>
                                        <p className="text-slate-200 text-lg font-serif">"{insight.motivation}"</p>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1 italic">Pro Tips</p>
                                        {insight.tips.map((t, i) => (
                                            <div key={i} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex gap-4 items-center">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-brand-500 border border-slate-700 font-black text-xs shrink-0">{i+1}</div>
                                                <p className="text-sm text-slate-300 font-medium">{t}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-600 font-black uppercase tracking-widest text-[10px]">No data available</div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full bg-[#0a0f14]/50">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 no-scrollbar scroll-smooth">
                                {messages.length === 0 && (
                                    <div className="py-10 text-center space-y-6 animate-fade-in">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-brand-400 border border-slate-700 shadow-xl"><i className="fa-solid fa-comments text-2xl"></i></div>
                                        <div className="px-10 flex flex-col items-center">
                                            <div className="flex flex-col items-center">
                                                <div className="relative inline-block">
                                                    <p className="text-white font-black italic text-2xl uppercase tracking-tighter">NAMASTE {firstName}!</p>
                                                    <div className="absolute -bottom-1 left-0 right-0 h-1 bg-red-600 shadow-[0_2px_4px_#CC0000]"></div>
                                                </div>
                                            </div>
                                            <p className="text-slate-500 text-xs mt-6 max-w-[200px] leading-relaxed">Poocho kuch bhi about fitness, ya bas gup-shup!</p>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2 px-6">
                                            {SUGGESTIONS.map((s, i) => (
                                                <button key={i} onClick={() => handleSend(s)} className="bg-slate-800/60 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-400 hover:text-white transition-all">{s}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-pop`}>
                                        <div className={`max-w-[85%] ${m.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'} p-4 rounded-2xl shadow-xl relative`}>
                                            {m.role === 'model' && <p className="text-[8px] font-black uppercase text-brand-400 mb-1 tracking-widest italic">Coach</p>}
                                            <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                                            <span className="text-[7px] font-black uppercase opacity-40 mt-2 block text-right">{m.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="flex justify-start animate-message-pop">
                                        <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-1.5 shadow-xl border border-slate-700">
                                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 absolute bottom-0 left-0 right-0">
                                <div className="flex gap-2">
                                    <input 
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Poocho coach se..."
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-brand-500 transition-all font-bold placeholder:text-slate-700 shadow-inner"
                                    />
                                    <button 
                                        onClick={() => handleSend()}
                                        disabled={chatLoading || !input.trim()}
                                        className="w-14 h-14 bg-brand-600 hover:bg-brand-500 disabled:opacity-30 rounded-2xl text-white shadow-xl active:scale-90 transition-all border border-brand-400 flex items-center justify-center"
                                    >
                                        <i className="fa-solid fa-paper-plane"></i>
                                    </button>
                                </div>
                                <div className="flex justify-between items-center px-1 mt-3">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Hourly Cap: {usage.remaining} left</p>
                                    <p className="text-[8px] font-black text-brand-500/50 uppercase tracking-widest italic">Encrypted Connection</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};
