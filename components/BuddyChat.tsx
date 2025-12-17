
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, BuddyMessage } from '../types';
import { fetchMessages, sendMessage, subscribeToMessages } from '../services/buddyService';

interface BuddyChatProps {
    userId: string;
    buddy: UserProfile;
    onBack: () => void;
}

export const BuddyChat: React.FC<BuddyChatProps> = ({ userId, buddy, onBack }) => {
    const [messages, setMessages] = useState<BuddyMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadMessages();
        const sub = subscribeToMessages(userId, buddy.id!, (msg) => {
            setMessages(prev => [...prev, msg]);
        });
        return () => { sub.unsubscribe(); };
    }, [buddy.id]);

    useEffect(() => {
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }, [messages]);

    const loadMessages = async () => {
        try {
            const data = await fetchMessages(userId, buddy.id!);
            setMessages(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const temp = input;
        setInput('');
        try {
            // Optimistic update for sender
            const fakeMsg: BuddyMessage = {
                id: Math.random().toString(),
                sender_id: userId,
                receiver_id: buddy.id!,
                content: temp,
                is_read: false,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, fakeMsg]);
            await sendMessage(userId, buddy.id!, temp);
        } catch (e) { alert("Failed to send."); }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
            {/* Chat Top Bar */}
            <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-2xl mb-4">
                <button onClick={onBack} className="w-8 h-8 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center">
                    <i className="fa-solid fa-arrow-left text-xs"></i>
                </button>
                <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-8 h-8 rounded-full border border-slate-700" />
                <div>
                    <h4 className="text-white font-bold text-sm">{buddy.name}</h4>
                    <p className="text-[9px] text-green-500 font-bold uppercase">Online</p>
                </div>
            </div>

            {/* Message Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-1 no-scrollbar pb-4">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-600"><i className="fa-solid fa-spinner fa-spin"></i></div>
                ) : (
                    messages.map((m, idx) => {
                        const isMe = m.sender_id === userId;
                        return (
                            <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-message-pop`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                    {m.content}
                                    <div className={`text-[8px] mt-1 text-right opacity-60 ${isMe ? 'text-white' : 'text-slate-400'}`}>
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input */}
            <div className="flex gap-2 pt-2">
                <input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Type message..." 
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500"
                />
                <button onClick={handleSend} className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <i className="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </div>
    );
};
