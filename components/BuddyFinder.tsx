
import React, { useState, useEffect } from 'react';
import { UserProfile, NearbyBuddy, BuddyRequest } from '../types';
import { 
    findNearbyBuddies, updateBuddyPreferences, updateLocation, 
    sendBuddyRequest, fetchMyBuddyRequests, respondToRequest, fetchMyBuddies 
} from '../services/buddyService';
import { BuddyChat } from './BuddyChat';

interface BuddyFinderProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
}

export const BuddyFinder: React.FC<BuddyFinderProps> = ({ isOpen, onClose, profile }) => {
    const [view, setView] = useState<'discover' | 'requests' | 'my-buddies' | 'settings' | 'chat'>('discover');
    const [loading, setLoading] = useState(false);
    const [nearby, setNearby] = useState<NearbyBuddy[]>([]);
    const [requests, setRequests] = useState<BuddyRequest[]>([]);
    const [buddies, setBuddies] = useState<UserProfile[]>([]);
    const [selectedBuddy, setSelectedBuddy] = useState<UserProfile | null>(null);
    
    // Preferences Form
    const [isLooking, setIsLooking] = useState(profile.is_looking_for_buddy || false);
    const [bio, setBio] = useState(profile.bio || '');
    const [age, setAge] = useState(profile.age || 25);
    const [pace, setPace] = useState(profile.pace || 'moderate');
    const [time, setTime] = useState(profile.preferred_time || 'morning');

    useEffect(() => {
        if (isOpen && !profile.isGuest) {
            loadData();
        }
    }, [isOpen, view]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (view === 'discover') {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    await updateLocation(profile.id!, latitude, longitude);
                    const results = await findNearbyBuddies(latitude, longitude, 5000, profile.id!);
                    setNearby(results);
                    setLoading(false);
                }, () => {
                    alert("Location access needed to find buddies!");
                    setLoading(false);
                });
            } else if (view === 'requests') {
                const reqs = await fetchMyBuddyRequests(profile.id!);
                setRequests(reqs);
                setLoading(false);
            } else if (view === 'my-buddies') {
                const b = await fetchMyBuddies(profile.id!);
                setBuddies(b);
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const handleSavePrefs = async () => {
        setLoading(true);
        try {
            await updateBuddyPreferences(profile.id!, {
                is_looking_for_buddy: isLooking,
                bio,
                age,
                pace,
                preferred_time: time
            });
            alert("Preferences updated!");
            setView('discover');
        } catch (e) { alert("Save failed."); }
        setLoading(false);
    };

    const handleSendRequest = async (buddy: NearbyBuddy) => {
        try {
            const msg = prompt("Send a short intro message:", "Hey! Want to walk together?");
            if (msg === null) return;
            await sendBuddyRequest(profile.id!, buddy.id!, msg);
            alert("Request sent!");
            setNearby(prev => prev.filter(n => n.id !== buddy.id));
        } catch (e) { alert("Already requested or failed."); }
    };

    const handleRespond = async (req: BuddyRequest, status: 'accepted' | 'declined') => {
        try {
            await respondToRequest(req.id, status, req.sender_id, profile.id!);
            setRequests(prev => prev.filter(r => r.id !== req.id));
            if (status === 'accepted') alert("Walk Buddy added! Check 'My Buddies' to chat.");
        } catch (e) { alert("Failed to respond."); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[90] flex items-center justify-center p-4">
            <div className="bg-dark-card w-full max-w-2xl h-[85vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-white font-black text-xl flex items-center gap-2">
                            <i className="fa-solid fa-people-arrows text-brand-500"></i> Buddy Finder
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-800/50 border-b border-slate-700 p-1">
                    {[
                        { id: 'discover', icon: 'fa-search', label: 'Discover' },
                        { id: 'requests', icon: 'fa-envelope', label: 'Inbox' },
                        { id: 'my-buddies', icon: 'fa-user-group', label: 'Buddies' },
                        { id: 'settings', icon: 'fa-user-gear', label: 'Setup' }
                    ].map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setView(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${view === t.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <i className={`fa-solid ${t.icon}`}></i>
                            <span className="hidden sm:inline">{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 no-scrollbar bg-slate-900/20">
                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-slate-500">
                            <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-4"></i>
                            <p className="font-bold animate-pulse">Checking the neighborhood...</p>
                        </div>
                    )}

                    {!loading && view === 'discover' && (
                        <div className="space-y-4">
                            {nearby.length === 0 ? (
                                <div className="text-center py-20 text-slate-600">
                                    <i className="fa-solid fa-ghost text-5xl mb-4 opacity-30"></i>
                                    <p className="font-bold">No one nearby is looking right now.</p>
                                    <button onClick={() => setView('settings')} className="text-brand-500 text-sm mt-2 font-black underline">Update your status to 'Looking'</button>
                                </div>
                            ) : (
                                nearby.map(buddy => (
                                    <div key={buddy.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 flex gap-4 items-center group hover:bg-slate-800/60 transition-all">
                                        <div className="relative">
                                            <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-16 h-16 rounded-2xl border-2 border-slate-700 object-cover" />
                                            {buddy.is_verified && <i className="fa-solid fa-circle-check absolute -top-1 -right-1 text-blue-500 bg-white rounded-full text-xs"></i>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-white font-black truncate">{buddy.name}, {buddy.age}</h4>
                                                <span className="text-[10px] bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full font-bold">{(buddy.distance / 1000).toFixed(1)}km away</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1"><i className="fa-solid fa-bolt mr-1"></i> {buddy.pace} Pace • {buddy.preferred_time}</p>
                                            <p className="text-xs text-slate-400 mt-2 line-clamp-1 italic">"{buddy.bio || "Just looking for a walking buddy!"}"</p>
                                        </div>
                                        <button onClick={() => handleSendRequest(buddy)} className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                                            <i className="fa-solid fa-paper-plane text-xs"></i>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {view === 'requests' && (
                        <div className="space-y-4">
                            {requests.length === 0 ? (
                                <div className="text-center py-20 text-slate-600">
                                    <i className="fa-solid fa-inbox text-5xl mb-4 opacity-30"></i>
                                    <p className="font-bold">No pending requests.</p>
                                </div>
                            ) : (
                                requests.map(req => (
                                    <div key={req.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                                        <div className="flex gap-4 items-center mb-3">
                                            <img src={req.sender_profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-12 h-12 rounded-xl border border-slate-700" />
                                            <div>
                                                <h4 className="text-white font-bold">{req.sender_profile?.full_name}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{new Date(req.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/50 p-3 rounded-xl mb-4 text-xs text-slate-300 italic border-l-2 border-brand-500">
                                            "{req.message}"
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRespond(req, 'accepted')} className="flex-1 bg-brand-600 text-white font-bold py-2.5 rounded-xl text-xs active:scale-95 transition-all">Accept</button>
                                            <button onClick={() => handleRespond(req, 'declined')} className="flex-1 bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs active:scale-95 transition-all">Decline</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {view === 'my-buddies' && (
                        <div className="space-y-4">
                            {buddies.length === 0 ? (
                                <div className="text-center py-20 text-slate-600">
                                    <i className="fa-solid fa-user-group text-5xl mb-4 opacity-30"></i>
                                    <p className="font-bold">No buddies connected yet.</p>
                                </div>
                            ) : (
                                buddies.map(buddy => (
                                    <div 
                                        key={buddy.id} 
                                        onClick={() => { setSelectedBuddy(buddy); setView('chat'); }}
                                        className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 flex gap-4 items-center cursor-pointer hover:bg-slate-800/80 transition-all"
                                    >
                                        <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-12 h-12 rounded-xl border-2 border-slate-700 object-cover" />
                                        <div className="flex-1">
                                            <h4 className="text-white font-black">{buddy.name}</h4>
                                            <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest">Active Buddy</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center">
                                            <i className="fa-solid fa-comment-dots"></i>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {view === 'chat' && selectedBuddy && (
                        <BuddyChat 
                            userId={profile.id!} 
                            buddy={selectedBuddy} 
                            onBack={() => setView('my-buddies')} 
                        />
                    )}

                    {view === 'settings' && (
                        <div className="space-y-6 max-w-sm mx-auto py-5 animate-fade-in">
                            <div className="bg-brand-600/10 border border-brand-500/30 p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <i className="fa-solid fa-eye text-brand-400"></i>
                                    <span className="text-sm text-white font-bold">Show me to others</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={isLooking} 
                                    onChange={e => setIsLooking(e.target.checked)} 
                                    className="w-5 h-5 accent-brand-500" 
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[3px] mb-2 block">Short Bio</label>
                                    <textarea 
                                        value={bio} 
                                        onChange={e => setBio(e.target.value)} 
                                        placeholder="E.g. Love early morning walks at Marine Drive!" 
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none h-24 resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] mb-2 block">Your Age</label>
                                        <input type="number" value={age} onChange={e => setAge(parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] mb-2 block">Pace</label>
                                        <select value={pace} onChange={e => setPace(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none">
                                            <option value="slow">Slow Stroll</option>
                                            <option value="moderate">Steady</option>
                                            <option value="fast">Brisk/Power</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleSavePrefs} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-900/20 active:scale-95 transition-all">
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
