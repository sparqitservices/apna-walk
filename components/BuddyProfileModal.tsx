import React, { useState, useEffect } from 'react';
import { UserProfile, MutualFriend } from '../types';
import { fetchMutualFriends, removeBuddy } from '../services/buddyService';

interface BuddyProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string;
    buddy: UserProfile;
    onBuddyRemoved: () => void;
    onChatRequest: () => void;
}

export const BuddyProfileModal: React.FC<BuddyProfileModalProps> = ({ 
    isOpen, onClose, currentUserId, buddy, onBuddyRemoved, onChatRequest 
}) => {
    const [mutuals, setMutuals] = useState<MutualFriend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetchMutualFriends(currentUserId, buddy.id!).then(data => {
                setMutuals(data);
                setLoading(false);
            });
        }
    }, [isOpen, buddy.id]);

    if (!isOpen) return null;

    const handleUnfriend = async () => {
        if (!confirm(`Remove @${buddy.username} from squad?`)) return;
        try {
            await removeBuddy(currentUserId, buddy.id!);
            onBuddyRemoved();
            onClose();
        } catch (e) { alert("Action failed."); }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-dark-card w-full max-w-lg rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-message-pop relative">
                
                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-brand-600/20 to-blue-600/20 absolute top-0 left-0 w-full z-0"></div>
                
                <div className="p-8 relative z-10">
                    <div className="flex justify-end mb-4">
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-brand-500 overflow-hidden border-4 border-slate-900 shadow-2xl">
                                <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-slate-900 rounded-full animate-pulse shadow-xl"></div>
                        </div>

                        <h3 className="text-3xl font-black text-white italic tracking-tighter">@{buddy.username}</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-[4px] text-[10px] mt-1 mb-4">{buddy.name}</p>
                        
                        <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-3xl w-full text-sm text-slate-300 italic mb-8 relative">
                            <i className="fa-solid fa-quote-left absolute -top-3 -left-1 text-2xl text-brand-500/20"></i>
                            "{buddy.bio || "Crushing steps and chasing sunrises."}"
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full mb-8">
                            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Pace</span>
                                <span className="text-white font-black uppercase text-xs">{buddy.pace}</span>
                            </div>
                            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Timing</span>
                                <span className="text-white font-black uppercase text-xs">{buddy.preferred_time}</span>
                            </div>
                        </div>

                        {/* Mutual Friends */}
                        <div className="w-full space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[3px]">Mutual Buddies</h4>
                                <span className="text-[10px] text-brand-500 font-black">{mutuals.length} Total</span>
                            </div>
                            {loading ? (
                                <div className="h-12 flex items-center justify-center opacity-20"><i className="fa-solid fa-circle-notch fa-spin"></i></div>
                            ) : mutuals.length > 0 ? (
                                <div className="flex items-center -space-x-4 px-2">
                                    {mutuals.slice(0, 5).map(m => (
                                        <img key={m.id} src={m.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-10 h-10 rounded-xl border-2 border-slate-900 object-cover hover:scale-110 transition-transform cursor-pointer" title={`@${m.username}`} />
                                    ))}
                                    {mutuals.length > 5 && (
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-400 z-10">
                                            +{mutuals.length - 5}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest px-2">No shared connections yet</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 bg-slate-900/50 border-t border-slate-800 grid grid-cols-2 gap-4">
                    <button onClick={onChatRequest} className="bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-[4px] text-[10px] flex items-center justify-center gap-2">
                        <i className="fa-solid fa-comment-dots"></i> Message
                    </button>
                    <button onClick={handleUnfriend} className="bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-400 font-black py-4 rounded-2xl transition-all border border-slate-700 uppercase tracking-[4px] text-[10px] flex items-center justify-center gap-2">
                        <i className="fa-solid fa-user-minus"></i> Remove
                    </button>
                </div>
            </div>
        </div>
    );
};