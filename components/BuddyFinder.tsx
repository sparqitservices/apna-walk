
import React, { useState, useEffect } from 'react';
import { UserProfile, NearbyBuddy, BuddyRequest } from '../types';
import { 
    findNearbyBuddies, updateBuddyPreferences, updateLocation, 
    sendBuddyRequest, fetchMyBuddyRequests, respondToRequest, fetchMyBuddies,
    searchUsers 
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
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
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
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        await updateLocation(profile.id!, latitude, longitude);
                        const results = await findNearbyBuddies(latitude, longitude, 5000, profile.id!);
                        setNearby(results);
                        setLoading(false);
                    }, () => {
                        setLoading(false);
                    });
                } else {
                    setLoading(false);
                }
            } else if (view === 'requests') {
                const reqs = await fetchMyBuddyRequests(profile.id!);
                setRequests(reqs);
                setLoading(false);
            } else if (view === 'my-buddies') {
                const b = await fetchMyBuddies(profile.id!);
                setBuddies(b);
                setLoading(false);
            } else {
                setLoading(false);
            }
        } catch (e) {
            console.error("BuddyFinder loadData Error:", e);
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.length < 3) return;
        setLoading(true);
        try {
            const results = await searchUsers(searchQuery, profile.id!);
            setSearchResults(results);
        } catch (e) { console.error(e); }
        setLoading(false);
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

    const handleSendRequest = async (buddy: UserProfile | NearbyBuddy) => {
        try {
            const msg = prompt("Send a short intro message:", "Hey! Want to walk together?");
            if (msg === null) return;
            await sendBuddyRequest(profile.id!, buddy.id!, msg);
            alert("Request sent successfully!");
            // Update local state to avoid re-sending
            setNearby(prev => prev.filter(n => n.id !== buddy.id));
            setSearchResults(prev => prev.filter(s => s.id !== buddy.id));
        } catch (e: any) { alert(e.message || "Failed to send request."); }
    };

    const handleRespond = async (req: BuddyRequest, status: 'accepted' | 'declined') => {
        try {
            setLoading(true);
            await respondToRequest(req.id, status, req.sender_id, profile.id!);
            setRequests(prev => prev.filter(r => r.id !== req.id));
            if (status === 'accepted') {
                alert("Walk Buddy added! Shabaash! Check 'My Buddies' to start chatting.");
            } else {
                alert("Request declined.");
            }
        } catch (e) { 
            console.error(e);
            alert("Failed to respond to request."); 
        } finally {
            setLoading(false);
        }
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
                        <button onClick={loadData} className={`w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-brand-500 flex items-center justify-center transition-colors ${loading ? 'animate-spin' : ''}`}>
                            <i className="fa-solid fa-rotate-right text-xs"></i>
                        </button>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-800/50 border-b border-slate-700 p-1">
                    {[
                        { id: 'discover', icon: 'fa-search', label: 'Discover' },
                        { id: 'requests', icon: 'fa-envelope', label: 'Inbox', count: requests.length },
                        { id: 'my-buddies', icon: 'fa-user-group', label: 'Buddies' },
                        { id: 'settings', icon: 'fa-user-gear', label: 'Setup' }
                    ].map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setView(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all relative ${view === t.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <i className={`fa-solid ${t.icon}`}></i>
                            <span className="hidden sm:inline">{t.label}</span>
                            {t.count && t.count > 0 ? (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                                    {t.count}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 no-scrollbar bg-slate-900/20">
                    {loading && view !== 'chat' && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                             <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                             <p className="font-black uppercase text-[10px] tracking-[4px]">Updating secure sync...</p>
                        </div>
                    )}

                    {!loading && view === 'discover' && (
                        <div className="space-y-6">
                            {/* Search Bar */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Search friends by name or email..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-brand-500 outline-none transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={handleSearch}
                                    className="bg-brand-600 text-white px-5 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg"
                                >
                                    Search
                                </button>
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-brand-500 rounded-full"></div> Results
                                    </h3>
                                    {searchResults.map(buddy => (
                                        <div key={buddy.id} className="bg-slate-800/60 border border-brand-500/30 rounded-2xl p-4 flex gap-4 items-center group hover:bg-slate-800/80 transition-all animate-message-pop">
                                            <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-14 h-14 rounded-2xl border-2 border-slate-700 object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-black truncate">{buddy.name}</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{buddy.email}</p>
                                            </div>
                                            <button onClick={() => handleSendRequest(buddy)} className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                                                <i className="fa-solid fa-user-plus text-xs"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Nearby Discover */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                    <div className="w-1 h-1 bg-brand-500 rounded-full"></div> Discovery
                                </h3>
                                {nearby.length === 0 ? (
                                    <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                                        <i className="fa-solid fa-location-crosshairs text-4xl mb-4 opacity-30"></i>
                                        <p className="text-sm font-bold">No one active nearby.</p>
                                        <p className="text-[10px] uppercase mt-2 opacity-50">Try searching for a friend's email above</p>
                                    </div>
                                ) : (
                                    nearby.map(buddy => (
                                        <div key={buddy.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 flex gap-4 items-center group hover:bg-slate-800/60 transition-all animate-message-pop">
                                            <div className="relative">
                                                <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-16 h-16 rounded-2xl border-2 border-slate-700 object-cover" />
                                                {buddy.is_verified && <i className="fa-solid fa-circle-check absolute -top-1 -right-1 text-blue-500 bg-white rounded-full text-xs"></i>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-white font-black truncate">{buddy.name}, {buddy.age}</h4>
                                                    <span className="text-[10px] bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full font-bold">{(buddy.distance / 1000).toFixed(1)}km</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1"><i className="fa-solid fa-bolt mr-1"></i> {buddy.pace} Pace</p>
                                                <p className="text-xs text-slate-400 mt-2 line-clamp-1 italic opacity-70">"{buddy.bio || "Just looking for a buddy!"}"</p>
                                            </div>
                                            <button onClick={() => handleSendRequest(buddy)} className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                                                <i className="fa-solid fa-paper-plane text-xs"></i>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && view === 'requests' && (
                        <div className="space-y-4">
                            {requests.length === 0 ? (
                                <div className="text-center py-24 text-slate-600 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <i className="fa-solid fa-envelope-open text-4xl opacity-30"></i>
                                    </div>
                                    <p className="font-black uppercase tracking-widest text-sm">Inbox is empty</p>
                                    <p className="text-[10px] mt-2 opacity-50">Pending walk requests will appear here</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    <div className="text-center mb-2">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[4px]">You have {requests.length} pending invite{requests.length > 1 ? 's' : ''}</span>
                                    </div>
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-slate-800 border-2 border-slate-700/50 rounded-3xl p-5 shadow-xl animate-message-pop hover:border-brand-500/30 transition-all">
                                            <div className="flex gap-4 items-center mb-4">
                                                <img src={req.sender_profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-14 h-14 rounded-2xl border-2 border-slate-700 object-cover shadow-lg" />
                                                <div className="flex-1">
                                                    <h4 className="text-white font-black text-base">{req.sender_profile?.full_name || 'Walking Partner'}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                        <i className="fa-regular fa-clock text-brand-500"></i> {new Date(req.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-900/60 p-4 rounded-2xl mb-6 text-sm text-slate-300 italic border-l-4 border-brand-500 leading-relaxed">
                                                "{req.message || "Hi, let's walk together!"}"
                                            </div>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => handleRespond(req, 'accepted')} 
                                                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-brand-900/20 active:scale-95 transition-all"
                                                >
                                                    Accept
                                                </button>
                                                <button 
                                                    onClick={() => handleRespond(req, 'declined')} 
                                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && view === 'my-buddies' && (
                        <div className="space-y-4">
                            {buddies.length === 0 ? (
                                <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <i className="fa-solid fa-user-group text-4xl opacity-30"></i>
                                    </div>
                                    <p className="font-black uppercase tracking-widest text-sm">No buddies yet</p>
                                    <p className="text-[10px] mt-2 opacity-50">Connect with others in the Discover tab</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {buddies.map(buddy => (
                                        <div 
                                            key={buddy.id} 
                                            onClick={() => { setSelectedBuddy(buddy); setView('chat'); }}
                                            className="bg-slate-800/40 border border-slate-700 rounded-3xl p-4 flex gap-4 items-center cursor-pointer hover:bg-slate-800/80 transition-all group animate-message-pop shadow-md"
                                        >
                                            <div className="relative">
                                                <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-14 h-14 rounded-2xl border-2 border-slate-700 object-cover shadow-lg" />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-800 rounded-full"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-black truncate">{buddy.name}</h4>
                                                <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest mt-0.5">Connected Buddy</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center transition-all group-hover:bg-brand-600 group-hover:text-white shadow-inner">
                                                <i className="fa-solid fa-comment-dots text-xl"></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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

                    {!loading && view === 'settings' && (
                        <div className="space-y-6 max-w-sm mx-auto py-5 animate-fade-in">
                            <div className="bg-brand-600/10 border border-brand-500/30 p-5 rounded-3xl flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white">
                                        <i className="fa-solid fa-eye"></i>
                                    </div>
                                    <div>
                                        <span className="text-sm text-white font-black block">Public Profile</span>
                                        <span className="text-[10px] text-brand-400 font-bold uppercase">Others can find you</span>
                                    </div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={isLooking} 
                                    onChange={e => setIsLooking(e.target.checked)} 
                                    className="w-6 h-6 accent-brand-500" 
                                />
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[3px] mb-2 block ml-2">Short Bio</label>
                                    <textarea 
                                        value={bio} 
                                        onChange={e => setBio(e.target.value)} 
                                        placeholder="E.g. Love early morning walks at Marine Drive!" 
                                        className="w-full bg-slate-800 border border-slate-700 rounded-3xl p-5 text-sm text-white focus:border-brand-500 outline-none h-32 resize-none shadow-inner"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] mb-2 block ml-2">Your Age</label>
                                        <input type="number" value={age} onChange={e => setAge(parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm font-black text-white outline-none shadow-inner" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] mb-2 block ml-2">Pace</label>
                                        <select value={pace} onChange={e => setPace(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm font-black text-white outline-none shadow-inner">
                                            <option value="slow">Slow Stroll</option>
                                            <option value="moderate">Steady</option>
                                            <option value="fast">Brisk/Power</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleSavePrefs} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-5 rounded-3xl shadow-xl shadow-brand-900/20 active:scale-95 transition-all text-sm uppercase tracking-[2px]">
                                    Update Discovery Card
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
