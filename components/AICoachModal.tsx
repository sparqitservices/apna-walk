import React, { useState, useEffect, useRef } from 'react';
import { WalkSession, AIInsight } from '../types';
import { getWalkingInsight, chatWithCoach } from '../services/geminiService';
import { RouteMap } from './RouteMap';

interface AICoachModalProps {
  session: WalkSession | null;
  isOpen: boolean;
  onClose: () => void;
  isGuest: boolean;
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
  "Weight loss tips batao ⚖️",
  "Mera posture theek kaise karoon? 🧘"
];

// Add type definition for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const AICoachModal: React.FC<AICoachModalProps> = ({ session, isOpen, onClose, isGuest, onLoginRequest, onShareStats }) => {
  const [activeTab, setActiveTab] = useState<'insight' | 'chat'>('insight');
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Voice Typing State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice Note Recording State
  const [isRecordingNote, setIsRecordingNote] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading, activeTab]);

  // Reset state when a new session is loaded
  useEffect(() => {
    if (session) {
      setInsight(null);
      setMessages([]);
      setActiveTab('insight');
    }
  }, [session?.id]);

  // Fetch insights when modal opens and we don't have them yet
  useEffect(() => {
    if (isOpen && session && !insight && !isGuest && !loading) {
      setLoading(true);
      getWalkingInsight(session)
        .then(setInsight)
        .catch((err) => console.error("Failed to get insight:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, session, insight, isGuest, loading]);

  const getTimeString = () => {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    
    setInput('');
    
    // Stop listening if active
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }

    setMessages(prev => [...prev, { role: 'user', text: textToSend, timestamp: getTimeString() }]);
    setChatLoading(true);
    
    try {
        const contextMessages = messages.map(m => ({ role: m.role, text: m.text }));
        const response = await chatWithCoach(contextMessages, textToSend);
        setMessages(prev => [...prev, { role: 'model', text: response, timestamp: getTimeString() }]);
    } catch (err: any) {
        // ERROR LOGGING HERE
        console.error("Chat Error:", err);
        setMessages(prev => [...prev, { role: 'model', text: "Arre yaar, signal drop ho gaya. Phir se bolo?", timestamp: getTimeString() }]);
    } finally {
        setChatLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
        if (recognitionRef.current) recognitionRef.current.stop();
        setIsListening(false);
        return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice typing is not supported in this browser.");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English context
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech error", event.error);
        setIsListening(false);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- Voice Note Logic ---

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };

          mediaRecorder.start();
          setIsRecordingNote(true);
          setRecordingTime(0);
          
          recordingTimerRef.current = setInterval(() => {
              setRecordingTime(prev => prev + 1);
          }, 1000);

      } catch (err) {
          console.error("Error accessing microphone:", err);
          alert("Could not access microphone.");
      }
  };

  const stopRecordingAndSend = () => {
      if (mediaRecorderRef.current && isRecordingNote) {
          mediaRecorderRef.current.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // Default to webm/wav depending on browser, usually playable
              const audioUrl = URL.createObjectURL(audioBlob);
              
              // Convert to Base64 for Gemini
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async () => {
                  const base64String = (reader.result as string).split(',')[1];
                  
                  // Add User Audio Message
                  setMessages(prev => [...prev, { 
                      role: 'user', 
                      text: "🎤 Voice Message", 
                      timestamp: getTimeString(),
                      audioUrl: audioUrl
                  }]);

                  setChatLoading(true);
                  
                  try {
                      // Send to Gemini with audio context
                      const contextMessages = messages.map(m => ({ role: m.role, text: m.text }));
                      // We send "Process this voice note" as the text prompt alongside the audio
                      const response = await chatWithCoach(contextMessages, "Process this voice note", base64String);
                      setMessages(prev => [...prev, { role: 'model', text: response, timestamp: getTimeString() }]);
                  } catch (e) {
                       console.error("Voice Note Error:", e);
                       setMessages(prev => [...prev, { role: 'model', text: "Voice note samajh nahi aaya. Phir se try karo!", timestamp: getTimeString() }]);
                  } finally {
                      setChatLoading(false);
                  }
              };
          };
          mediaRecorderRef.current.stop();
          
          // Cleanup
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          clearInterval(recordingTimerRef.current);
          setIsRecordingNote(false);
      }
  };

  const cancelRecording = () => {
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      clearInterval(recordingTimerRef.current);
      setIsRecordingNote(false);
      audioChunksRef.current = [];
  };

  const formatDuration = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-lg rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col h-[85vh] relative">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-500/20 border-2 border-slate-800">
                    <i className="fa-solid fa-person-running text-white text-lg"></i>
                </div>
                {!isGuest && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></div>}
            </div>
            <div>
                <h2 className="text-white font-bold text-base leading-tight">Apna Coach</h2>
                <p className="text-[10px] text-brand-400 font-medium tracking-wide uppercase">{isGuest ? 'Offline Mode' : 'Online • Desi Style'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {isGuest ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#22c55e 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.1)] border border-slate-700 relative z-10">
                    <i className="fa-solid fa-crown text-3xl text-yellow-500 animate-bounce"></i>
                </div>
                
                <h3 className="text-white font-bold text-2xl mb-2 relative z-10">ApnaWalk VIP</h3>
                <p className="text-slate-400 text-sm max-w-xs mb-8 relative z-10 leading-relaxed">
                    Arre dost! Sign in to unlock Apna Coach. He'll analyze your walks, give Desi tips, and chat with you in Hinglish!
                </p>
                
                <button 
                    onClick={() => { onClose(); onLoginRequest(); }}
                    className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-brand-500/20 active:scale-95 relative z-10 flex items-center gap-2"
                >
                    <i className="fa-brands fa-google"></i> Login to Unlock
                </button>
            </div>
        ) : (
            <>
                {/* Tabs */}
                <div className="flex border-b border-slate-700 shrink-0 bg-slate-900/30">
                <button 
                    onClick={() => setActiveTab('insight')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'insight' ? 'text-brand-400 border-b-2 border-brand-400 bg-brand-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <i className="fa-solid fa-chart-pie mr-2"></i>Analysis
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'chat' ? 'text-brand-400 border-b-2 border-brand-400 bg-brand-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <i className="fa-regular fa-comments mr-2"></i>Apna Coach
                </button>
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-hidden relative bg-dark-bg">
                    {activeTab === 'insight' ? (
                        <div className="h-full overflow-y-auto p-6 space-y-6 scroll-smooth">
                            {/* Share Stats Button */}
                            {session && (
                                <button 
                                    onClick={() => onShareStats(session)}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2"
                                >
                                    <i className="fa-solid fa-share-nodes"></i> Share Session Card
                                </button>
                            )}

                            {/* Map Visualization */}
                            {session?.route && session.route.length > 1 && (
                                <div className="mb-4">
                                    <RouteMap route={session.route} className="h-48 w-full rounded-xl" />
                                    <p className="text-[10px] text-slate-500 text-center mt-2 flex items-center justify-center gap-1">
                                        <i className="fa-solid fa-map-pin text-brand-500"></i> Local path visualization
                                    </p>
                                </div>
                            )}

                            {!session ? (
                                <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                                    <i className="fa-solid fa-shoe-prints text-4xl mb-4 opacity-20"></i>
                                    <p>Chalo, start walking to get data!</p>
                                </div>
                            ) : loading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                                    </div>
                                    <p className="text-slate-400 text-sm animate-pulse">Consulting the fitness gurus...</p>
                                </div>
                            ) : insight ? (
                                <>
                                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl text-brand-500 rotate-12 pointer-events-none">
                                        <i className="fa-solid fa-clipboard-list"></i>
                                    </div>
                                    <h3 className="text-brand-400 font-bold mb-3 text-xs uppercase tracking-widest">Coach's Verdict</h3>
                                    <p className="text-slate-200 leading-relaxed font-medium text-lg">"{insight.summary}"</p>
                                </div>
                                
                                <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-5 rounded-2xl border border-orange-500/20">
                                    <h3 className="text-orange-400 font-bold mb-3 text-xs uppercase tracking-widest">Daily Motivation</h3>
                                    <div className="flex gap-4">
                                        <div className="w-1 bg-orange-500 rounded-full h-full opacity-50"></div>
                                        <p className="text-slate-200 italic font-serif text-lg">"{insight.motivation}"</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">Pro Tips for You</h3>
                                    {insight.tips.map((tip, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-brand-500 shrink-0 border border-slate-700">
                                            {idx + 1}
                                        </div>
                                        <span className="text-sm text-slate-300">{tip}</span>
                                    </div>
                                    ))}
                                </div>
                                </>
                            ) : (
                                <div className="text-center text-red-400 bg-red-900/10 p-4 rounded-xl border border-red-900/30">
                                    <i className="fa-solid fa-triangle-exclamation mb-2 text-xl"></i>
                                    <p>Arre yaar, something went wrong. Try again?</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full absolute inset-0 bg-dark-bg">
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scroll-smooth">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full space-y-6 pt-10 pb-4">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-brand-500/10">
                                            <i className="fa-solid fa-comment-dots text-3xl text-brand-400"></i>
                                        </div>
                                        <div className="text-center max-w-[250px]">
                                            <p className="text-white font-bold mb-1">Namaste! Main hoon Aapka Coach.</p>
                                            <p className="text-slate-400 text-xs">Poocho kuch bhi about fitness, diet, ya bas gup-shup!</p>
                                        </div>
                                        
                                        {/* Suggested Chips */}
                                        <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                                            {SUGGESTIONS.map((s, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => handleSend(s)}
                                                    className="bg-slate-800/60 hover:bg-slate-700 border border-slate-700 rounded-full px-3 py-1.5 text-xs text-slate-300 transition-all active:scale-95"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-pop`}>
                                        <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            
                                            {/* Avatar for Model */}
                                            {m.role === 'model' && (
                                                <div className="flex items-center gap-2 mb-1 pl-1">
                                                     <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
                                                         <i className="fa-solid fa-robot text-[10px] text-white"></i>
                                                     </div>
                                                     <span className="text-[10px] text-slate-400 font-bold">Apna Coach</span>
                                                </div>
                                            )}

                                            <div 
                                                className={`p-3 rounded-2xl text-sm shadow-sm relative group
                                                ${m.role === 'user' 
                                                    ? 'bg-brand-600 text-white rounded-tr-sm' 
                                                    : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'}`}
                                            >
                                                {m.text}
                                                
                                                {/* Audio Player */}
                                                {m.audioUrl && (
                                                    <div className="mt-2 mb-1 p-1 bg-black/20 rounded-lg">
                                                        <audio controls src={m.audioUrl} className="h-8 w-48 max-w-full rounded" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Timestamp */}
                                            <span className={`text-[9px] mt-1 opacity-60 font-medium px-1 flex gap-1 items-center ${m.role === 'user' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {m.timestamp}
                                                {m.role === 'user' && <i className="fa-solid fa-check text-[8px]"></i>}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                
                                {chatLoading && (
                                    <div className="flex justify-start animate-message-pop">
                                        <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm border border-slate-700">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-dark-card border-t border-slate-700/50 backdrop-blur-md">
                                
                                {/* Recording Overlay */}
                                {isRecordingNote ? (
                                    <div className="flex items-center gap-3 w-full bg-slate-800 p-2 rounded-2xl border border-red-500/50 animate-pulse shadow-lg">
                                        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white animate-pulse">
                                            <i className="fa-solid fa-microphone"></i>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white text-sm font-bold">Recording... {formatDuration(recordingTime)}</p>
                                            <p className="text-slate-400 text-xs">Speak your mind, dost!</p>
                                        </div>
                                        <button 
                                            onClick={cancelRecording}
                                            className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                        >
                                            <i className="fa-solid fa-xmark"></i>
                                        </button>
                                        <button 
                                            onClick={stopRecordingAndSend}
                                            className="w-10 h-10 rounded-full bg-brand-500 text-white hover:bg-brand-600 flex items-center justify-center shadow-lg transition-colors"
                                        >
                                            <i className="fa-solid fa-paper-plane"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1 relative">
                                            <input 
                                                type="text" 
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                placeholder={isListening ? "Listening..." : "Poocho..."}
                                                className={`w-full bg-slate-900 border ${isListening ? 'border-brand-500 pl-9' : 'border-slate-700'} rounded-2xl pl-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-all pr-10`}
                                            />
                                            
                                            {isListening && (
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                                    <div className="w-0.5 h-2 bg-red-500 animate-wave"></div>
                                                    <div className="w-0.5 h-3 bg-red-500 animate-wave delay-75"></div>
                                                    <div className="w-0.5 h-1 bg-red-500 animate-wave delay-150"></div>
                                                </div>
                                            )}

                                            {/* Mic Button for Speech-to-Text */}
                                            <button 
                                                onClick={toggleVoiceInput}
                                                className={`absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isListening ? 'text-red-500' : 'text-slate-400 hover:text-brand-400'}`}
                                            >
                                                <i className={`fa-solid ${isListening ? 'fa-microphone-slash' : 'fa-microphone-lines'}`}></i>
                                            </button>
                                        </div>

                                        {input.trim() ? (
                                            <button 
                                                onClick={() => handleSend()}
                                                disabled={chatLoading}
                                                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 shrink-0"
                                            >
                                                <i className="fa-solid fa-paper-plane"></i>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={startRecording}
                                                disabled={chatLoading}
                                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
                                            >
                                                <i className="fa-solid fa-microphone"></i>
                                            </button>
                                        )}
                                    </div>
                                )}
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