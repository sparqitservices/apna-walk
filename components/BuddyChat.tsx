
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, BuddyMessage, DuelConfig } from '../types';
import { fetchMessages, sendMessage, subscribeToMessages, createSyncChannel, uploadVoiceNote, sendDuel, respondToDuel } from '../services/buddyService';
import { generateKeyPair, encryptMessage, decryptMessage } from '../services/cryptoService';
import { supabase } from '../services/supabaseClient';

interface BuddyChatProps {
    userId: string;
    buddy: UserProfile;
    onBack: () => void;
}

export const BuddyChat: React.FC<BuddyChatProps> = ({ userId, buddy, onBack }) => {
    const [messages, setMessages] = useState<BuddyMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [showDuelPicker, setShowDuelPicker] = useState(false);
    
    // Duel live state (for current active duel only)
    const [liveDuelSteps, setLiveDuelSteps] = useState<{ [senderId: string]: number }>({});

    // E2EE Keys
    const [myPrivateKey, setMyPrivateKey] = useState<string | null>(null);
    const [isSecure, setIsSecure] = useState(false);

    // Voice Note State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<any>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);
    const syncChannelRef = useRef<any>(null);

    useEffect(() => {
        setupCrypto();
        loadMessages();
        
        const sub = subscribeToMessages(userId, buddy.id!, (msg) => {
            setMessages(prev => {
                const idx = prev.findIndex(m => m.id === msg.id);
                if (idx >= 0) {
                    const newArr = [...prev];
                    newArr[idx] = msg;
                    return newArr;
                }
                return [...prev, msg];
            });
        });

        syncChannelRef.current = createSyncChannel(userId, buddy.id!, (event, payload) => {
            if (event === 'typing') setPartnerTyping(payload);
            if (event === 'duel_progress') {
                setLiveDuelSteps(prev => ({ ...prev, [payload.senderId]: payload.steps }));
            }
        });

        return () => { 
            sub.unsubscribe(); 
            syncChannelRef.current?.unsubscribe();
        };
    }, [buddy.id]);

    // Broadcast our steps if we have an active duel
    useEffect(() => {
        const activeDuel = messages.find(m => m.duel_config?.status === 'active');
        if (activeDuel) {
            const today = new Date().toISOString().split('T')[0];
            const myCurrentSteps = parseInt(localStorage.getItem(`daily_steps_${today}`) || '0', 10);
            syncChannelRef.current?.sendDuelProgress(myCurrentSteps, activeDuel.id);
        }
    }, [messages.length]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, partnerTyping]);

    const setupCrypto = async () => {
        let privateKey = localStorage.getItem(`apnawalk_sk_${userId}`);
        let publicKey = localStorage.getItem(`apnawalk_pk_${userId}`);
        
        if (!privateKey || !publicKey) {
            const keys = await generateKeyPair();
            privateKey = keys.privateKey;
            publicKey = keys.publicKey;
            localStorage.setItem(`apnawalk_sk_${userId}`, privateKey);
            localStorage.setItem(`apnawalk_pk_${userId}`, publicKey);
            await supabase.from('profiles').update({ public_key: publicKey }).eq('id', userId);
        }
        
        setMyPrivateKey(privateKey);
        setIsSecure(!!buddy.public_key);
    };

    const loadMessages = async () => {
        try {
            const data = await fetchMessages(userId, buddy.id!);
            const privateKey = localStorage.getItem(`apnawalk_sk_${userId}`);
            
            const decrypted = await Promise.all(data.map(async (m) => {
                if (m.is_encrypted && privateKey) {
                    const content = await decryptMessage(m.content, privateKey);
                    return { ...m, content };
                }
                return m;
            }));
            
            setMessages(decrypted);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!input.trim() || isRecording) return;
        const rawContent = input;
        setInput('');
        
        if (navigator.vibrate) navigator.vibrate(20);

        try {
            let finalContent = rawContent;
            const useEncryption = !!buddy.public_key;
            if (useEncryption) finalContent = await encryptMessage(rawContent, buddy.public_key!);
            await sendMessage(userId, buddy.id!, finalContent, useEncryption);
            setIsTyping(false);
            syncChannelRef.current?.sendTyping(false);
        } catch (e) { alert("Failed to send."); }
    };

    const handleStartDuel = async (target: number) => {
        const today = new Date().toISOString().split('T')[0];
        const mySteps = parseInt(localStorage.getItem(`daily_steps_${today}`) || '0', 10);
        try {
            await sendDuel(userId, buddy.id!, target, mySteps);
            setShowDuelPicker(false);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } catch (e) { alert("Duel failed to start."); }
    };

    const handleAcceptDuel = async (msgId: string) => {
        const today = new Date().toISOString().split('T')[0];
        const mySteps = parseInt(localStorage.getItem(`daily_steps_${today}`) || '0', 10);
        try {
            await respondToDuel(msgId, 'active', mySteps);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } catch (e) { alert("Error accepting muqabla."); }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        if (!isTyping) {
            setIsTyping(true);
            syncChannelRef.current?.sendTyping(true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            syncChannelRef.current?.sendTyping(false);
        }, 3000);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const url = await uploadVoiceNote(blob, userId);
                await sendMessage(userId, buddy.id!, "🎤 Voice Note", false, url);
            };
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
            if (navigator.vibrate) navigator.vibrate([40, 20]);
        } catch (err) { alert("Mic access denied!"); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            clearInterval(recordingTimerRef.current);
            setIsRecording(false);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
        clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        audioChunksRef.current = [];
    };

    const renderDuelCard = (m: BuddyMessage) => {
        const d = m.duel_config!;
        const isMeSender = m.sender_id === userId;
        const today = new Date().toISOString().split('T')[0];
        const myCurrentDaily = parseInt(localStorage.getItem(`daily_steps_${today}`) || '0', 10);
        
        // Progress Logic
        const senderProgress = isMeSender 
            ? Math.max(0, myCurrentDaily - d.start_steps_sender)
            : Math.max(0, (liveDuelSteps[m.sender_id] || d.start_steps_sender) - d.start_steps_sender);

        const receiverProgress = !isMeSender 
            ? Math.max(0, myCurrentDaily - d.start_steps_receiver)
            : Math.max(0, (liveDuelSteps[m.receiver_id] || d.start_steps_receiver) - d.start_steps_receiver);

        const myProgress = isMeSender ? senderProgress : receiverProgress;
        const buddyProgress = isMeSender ? receiverProgress : senderProgress;

        return (
            <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-black border-2 border-orange-500/40 rounded-3xl p-5 shadow-2xl animate-message-pop relative overflow-hidden">
                {/* Background Text */}
                <div className="absolute -top-4 -right-4 opacity-5 text-6xl font-black italic select-none">MUQABLA</div>
                
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-[3px]">Step Duel</span>
                        <h4 className="text-white font-black text-xl italic tracking-tighter">MUQABLA!</h4>
                    </div>
                    <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/30">
                        <i className="fa-solid fa-fire-flame-curved text-orange-500 text-xl"></i>
                    </div>
                </div>

                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Target: <span className="text-white">{d.target_steps.toLocaleString()}</span> Steps</p>

                {d.status === 'pending' ? (
                    <div className="space-y-4">
                        {isMeSender ? (
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-center">
                                <p className="text-xs text-slate-400 font-medium">Waiting for {buddy.name.split(' ')[0]} to accept...</p>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => handleAcceptDuel(m.id)} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg active:scale-95 transition-all">Accept muqabla</button>
                                <button className="px-4 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold">Nah</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Progressive Bars */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <span>You</span>
                                    <span className="text-white">{myProgress} / {d.target_steps}</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000" style={{ width: `${Math.min((myProgress / d.target_steps) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <span>{buddy.name.split(' ')[0]}</span>
                                    <span className="text-white">{buddyProgress} / {d.target_steps}</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000" style={{ width: `${Math.min((buddyProgress / d.target_steps) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Condition Check */}
                        <div className="text-center py-2">
                            {myProgress >= d.target_steps ? (
                                <div className="bg-green-500/10 border border-green-500/30 p-2 rounded-xl text-green-400 text-[10px] font-black uppercase tracking-[2px] animate-bounce">
                                    Victory! Shabaash! 🎉
                                </div>
                            ) : buddyProgress >= d.target_steps ? (
                                <div className="bg-red-500/10 border border-red-500/30 p-2 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-[2px]">
                                    Buddy Won! Try harder! 💪
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Muqabla in Progress...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col animate-fade-in relative bg-dark-bg/20 backdrop-blur-sm rounded-[2rem] overflow-hidden border border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-xl border-b border-white/10 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-800/80 text-white flex items-center justify-center hover:bg-brand-600 transition-all shadow-lg active:scale-90">
                        <i className="fa-solid fa-arrow-left text-sm"></i>
                    </button>
                    <div className="relative">
                        <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-11 h-11 rounded-2xl border-2 border-slate-700 object-cover" />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse shadow-md"></div>
                    </div>
                    <div>
                        <h4 className="text-white font-black text-sm tracking-tight">{buddy.name}</h4>
                        <div className="flex items-center gap-2">
                             <span className="text-[9px] text-green-400 font-black uppercase tracking-widest">Online</span>
                             {isSecure && <span className="text-[8px] bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold uppercase"><i className="fa-solid fa-shield-halved text-[7px]"></i> E2EE</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Message History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 p-6 no-scrollbar relative z-10 scroll-smooth pb-32">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3">
                        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-black uppercase tracking-tighter">Syncing muqablas...</p>
                    </div>
                ) : (
                    <>
                        {messages.map((m, idx) => {
                            if (m.duel_config) {
                                return <div key={m.id || idx} className="py-2">{renderDuelCard(m)}</div>;
                            }

                            const isMe = m.sender_id === userId;
                            const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            
                            return (
                                <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-message-pop`}>
                                    <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`relative px-4 py-3 rounded-2xl shadow-xl ${
                                            isMe 
                                            ? 'bg-gradient-to-tr from-brand-600 to-brand-500 text-white rounded-tr-none' 
                                            : 'bg-white/10 backdrop-blur-md text-slate-200 rounded-tl-none border border-white/10'
                                        }`}>
                                            {m.audio_url ? (
                                                <div className="flex items-center gap-3 py-1">
                                                    <button className={`w-9 h-9 rounded-full flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-brand-500'} shadow-lg`}>
                                                        <i className="fa-solid fa-play ml-1"></i>
                                                    </button>
                                                    <audio src={m.audio_url} className="hidden" />
                                                </div>
                                            ) : (
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                            )}
                                        </div>
                                        <span className="text-[8px] mt-1 opacity-40 font-black uppercase tracking-widest">{timeStr}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {partnerTyping && (
                            <div className="flex justify-start animate-message-pop">
                                <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 bg-brand-500 rounded-full animate-bounce"></div>
                                        <div className="w-1 h-1 bg-brand-500 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1 h-1 bg-brand-500 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Typing...</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Duel Selection Picker Overlay */}
            {showDuelPicker && (
                <div className="absolute bottom-24 left-4 right-4 bg-slate-900 border border-orange-500/50 rounded-[2.5rem] p-6 z-50 animate-message-pop shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h5 className="text-white font-black text-lg italic">CHOOSE GOAL</h5>
                        <button onClick={() => setShowDuelPicker(false)} className="text-slate-500"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[500, 1000, 2500].map(target => (
                            <button 
                                key={target}
                                onClick={() => handleStartDuel(target)}
                                className="bg-slate-800 hover:bg-orange-600 border border-slate-700 hover:border-orange-500 p-4 rounded-2xl text-center transition-all group"
                            >
                                <div className="text-white font-black text-xl mb-1">{target}</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase group-hover:text-white">Steps</div>
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest">Muqabla begins once buddy accepts!</p>
                </div>
            )}

            {/* Input Deck */}
            <div className="p-4 bg-white/5 backdrop-blur-2xl border-t border-white/10 z-20">
                {isRecording ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-3 flex items-center gap-4 animate-message-pop shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white animate-pulse shadow-lg"><i className="fa-solid fa-microphone"></i></div>
                        <div className="flex-1">
                            <span className="text-white text-xs font-black uppercase">Recording... {recordingTime}s</span>
                        </div>
                        <button onClick={cancelRecording} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center"><i className="fa-solid fa-trash-can"></i></button>
                        <button onClick={stopRecording} className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center"><i className="fa-solid fa-paper-plane"></i></button>
                    </div>
                ) : (
                    <div className="flex items-end gap-3">
                        <button 
                            onClick={() => setShowDuelPicker(!showDuelPicker)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 border ${showDuelPicker ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-white/10 text-orange-500 hover:bg-orange-600 hover:text-white'}`}
                        >
                            <i className="fa-solid fa-fire"></i>
                        </button>
                        <div className="flex-1 relative">
                            <input 
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder="Type message..." 
                                className="w-full bg-slate-900/80 border border-white/10 rounded-3xl px-5 py-4 text-sm text-white outline-none focus:border-brand-500/50 transition-all"
                            />
                        </div>
                        {input.trim() ? (
                            <button onClick={handleSend} className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xl active:scale-95"><i className="fa-solid fa-paper-plane"></i></button>
                        ) : (
                            <button onClick={startRecording} className="w-14 h-14 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shadow-xl active:scale-95"><i className="fa-solid fa-microphone"></i></button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
