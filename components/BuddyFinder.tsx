
import React, { useState, useEffect } from 'react';
import { UserProfile, NearbyBuddy, BuddyRequest, LiveConnection } from '../types';
import { 
    findNearbyBuddies, updateBuddyPreferences, updateLiveLocation, 
    sendBuddyRequest, fetchMyBuddyRequests, respondToRequest, fetchMyBuddies,
    searchUsers, fetchLiveConnections 
} from '../services/buddyService';
import { BuddyChat } from './BuddyChat';
import { BuddyProfileModal } from './BuddyProfileModal';
import { LiveBuddyMap } from './LiveBuddyMap';

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
    const [showProfile, setShowProfile] = useState(false);
    
    // Live Radar State
    const [showLiveRadar, setShowLiveRadar] = useState(false);
    const [liveConnections, setLiveConnections] = useState<LiveConnection[]>([]);
    const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);

    // Preferences Form
    const [isLooking, setIsLooking] = useState(profile.is_looking_for_buddy ?? true);
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
                        setUserCoords({ lat: latitude, lng: longitude });
                        /* Fixed: updateLocation changed to updateLiveLocation */
                        await updateLiveLocation(profile.id!, latitude, longitude);
                        const results = await findNearbyBuddies(latitude, longitude, 5000, profile.id!);
                        const scored = results.map(b => {
                            let score = 0;
                            if (b.pace === pace) score += 40;
                            if (b.preferred_time === time) score += 40;
                            if (Math.abs((b.age || 0) - age) < 5) score += 20;
                            return { ...b, match_score: score };
                        }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
                        setNearby(scored);
                        setLoading(false);
                    }, () => setLoading(false));
                } else setLoading(false);
            } else if (view === 'requests') {
                const reqs = await fetchMyBuddyRequests(profile.id!);
                setRequests(reqs);
                setLoading(false);
            } else if (view === 'my-buddies') {
                const b = await fetchMyBuddies(profile.id!);
                setBuddies(b);
                setLoading(false);
            } else setLoading(false);
        } catch (e) {
            console.error("BuddyFinder loadData Error:", e);
            setLoading(false);
        }
    };

    const handleOpenRadar = async () => {
        if (!profile.share_live_location) {
            alert("Please enable 'Live Sharing' in Settings first!");
            return;
        }
        setLoading(true);
        try {
            const data = await fetchLiveConnections(profile.id!);
            setLiveConnections(data);
            setShowLiveRadar(true);
        } catch (e) { alert("Radar offline."); }
        setLoading(false);
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

    const handleSendRequest = async (buddy: UserProfile | NearbyBuddy) => {
        try {
            const msg = prompt(`Say Namaste to @${buddy.username}:`, "Hey! Ready to walk together?");
            if (msg === null) return;
            await sendBuddyRequest(profile.id!, buddy.id!, msg);
            alert("Walk request sent!");
            setNearby(prev => prev.filter(n => n.id !== buddy.id));
            setSearchResults(prev => prev.filter(s => s.id !== buddy.id));
        } catch (e: any) { alert(e.message || "Failed to send request."); }
    };

    const handleRespond = async (req: BuddyRequest, status: 'accepted' | 'declined') => {
        try {
            setLoading(true);
            await respondToRequest(req.id, status, req.sender_id, profile.id!);
            setRequests(prev => prev.filter(r => r.id !== req.id));
            if (status === 'accepted') alert("Walk Buddy added! Shabaash!");
        } catch (e) { alert("Failed to respond."); }
        finally { setLoading(false); }
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
            alert("Discovery card updated!");
            setView('discover');
        } catch (e) { alert("Update failed."); }
        setLoading(false);
    };

    const openBuddyProfile = (buddy: UserProfile) => {
        setSelectedBuddy(buddy);
        setShowProfile(true);
    };

    const getMatchGradient = (score?: number) => {
        if (!score) return "from-slate-700 to-slate-800";
        if (score >= 80) return "from-brand-600 to-emerald-500 shadow-brand-500/20";
        if (score >= 50) return "from-blue-600 to-cyan-500 shadow-blue-500/20";
        return "from-slate-700 to-slate-800";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[90] flex items-center justify-center p-4">
            <div className="bg-dark-card w-full max-w-4xl h-[90vh] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
                <div className="p-6 sm:p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-blue-500 to-orange-500 opacity-50"></div>
                    <div>
                        <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tighter flex items-center gap-3">
                            <i className="fa-solid fa-bolt-lightning text-brand-400"></i> Discovery
                        </h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[4px] mt-1 ml-1">Connect & Walk</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 border border-slate-700 shadow-lg">
                        <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-20 sm:w-64 border-r border-slate-800 flex flex-col bg-slate-900/30 shrink-0">
                        <div className="p-4 space-y-2">
                            {[
                                { id: 'discover', icon: 'fa-compass', label: 'Explore' },
                                { id: 'requests', icon: 'fa-inbox', label: 'Inbox', count: requests.length },
                                { id: 'my-buddies', icon: 'fa-user-group', label: 'Squad' },
                                { id: 'settings', icon: 'fa-sliders', label: 'Setup' }
                            ].map(t => (
                                <button 
                                    key={t.id}
                                    onClick={() => { setView(t.id as any); setSelectedBuddy(null); }}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative ${view === t.id ? 'bg-brand-600 text-white shadow-xl shadow-brand-600/20' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}`}
                                >
                                    <div className="w-6 text-center"><i className={`fa-solid ${t.icon} text-lg`}></i></div>
                                    <span className="hidden sm:inline font-black text-sm uppercase tracking-widest">{t.label}</span>
                                    {t.count && t.count > 0 ? (
                                        <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">{t.count}</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar relative p-4 sm:p-8 bg-dark-bg/20">
                        {loading && view !== 'chat' && (
                            <div className="h-full flex flex-col items-center justify-center">
                                 <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-2xl animate-spin mb-6 shadow-xl"></div>
                                 <p className="font-black uppercase text-[10px] tracking-[6px] text-slate-500 animate-pulse">Syncing Vibe Map...</p>
                            </div>
                        )}

                        {!loading && view === 'discover' && (
                            <div className="space-y-10 animate-fade-in">
                                {/* NEW: LIVE SQUAD RADAR BUTTON */}
                                <button 
                                    onClick={handleOpenRadar}
                                    className="w-full bg-gradient-to-r from-brand-600 to-blue-600 p-6 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-2xl border border-white/10"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform">
                                            <i className="fa-solid fa-satellite-dish animate-pulse"></i>
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-white font-black text-xl italic uppercase tracking-tighter leading-none">Live Squad Radar</h4>
                                            <p className="text-white/60 text-[9px] font-bold uppercase tracking-[3px] mt-2">See Friends & FoF on Map</p>
                                        </div>
                                    </div>
                                    <i className="fa-solid fa-chevron-right text-white/50 group-hover:translate-x-2 transition-transform mr-4"></i>
                                </button>

                                <div className="relative group">
                                    <i className="fa-solid fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Enter @username..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-[2rem] pl-14 pr-6 py-5 text-sm text-white focus:border-brand-500 outline-none transition-all focus:bg-slate-800 shadow-inner"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {nearby.length === 0 ? (
                                        <div className="col-span-full py-20 text-center text-slate-600 flex flex-col items-center">
                                            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700"><i className="fa-solid fa-satellite-dish text-4xl opacity-30"></i></div>
                                            <p className="font-black text-xl tracking-tighter uppercase mb-2 text-white">Nobody nearby</p>
                                            <p className="text-xs max-w-xs mx-auto leading-relaxed">Adjust your preferences or search for a specific @username above.</p>
                                        </div>
                                    ) : (
                                        nearby.map(b => (
                                            <div key={b.id} className="relative group h-[380px] animate-message-pop">
                                                <div className={`absolute inset-0 bg-gradient-to-br ${getMatchGradient(b.match_score)} rounded-[3rem] p-1 shadow-2xl transition-all duration-500 group-hover:scale-[1.02]`}>
                                                    <div className="w-full h-full bg-slate-900 rounded-[2.8rem] overflow-hidden flex flex-col">
                                                        <div className="h-40 bg-slate-800/50 relative overflow-hidden flex items-center justify-center p-8">
                                                            <div className="relative z-10 w-24 h-24 rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl bg-slate-950 flex items-center justify-center">
                                                                {b.avatar ? <img src={b.avatar} className="w-full h-full object-cover" /> : <span className="text-white font-black text-4xl">{b.username?.charAt(0).toUpperCase()}</span>}
                                                            </div>
                                                            <div className="absolute top-6 right-6 bg-brand-600 text-white font-black text-[10px] px-3 py-1.5 rounded-full shadow-lg">
                                                                {b.match_score}% MATCH
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 p-6 flex flex-col justify-between">
                                                            <div>
                                                                <h4 className="text-white font-black text-2xl tracking-tighter flex items-center gap-2 mb-2">@{b.username}</h4>
                                                                <p className="text-slate-400 text-xs italic line-clamp-2">"{b.bio || "Searching for walking squad..."}"</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <span className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-[10px] font-black text-slate-300 uppercase flex items-center justify-center gap-2">Pace: {b.pace}</span>
                                                                <span className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-[10px] font-black text-slate-300 uppercase flex items-center justify-center gap-2">Time: {b.preferred_time}</span>
                                                            </div>
                                                            <button onClick={() => handleSendRequest(b)} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-[4px] text-xs">Send Namaste</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {view === 'requests' && (
                            <div className="space-y-6 max-w-2xl mx-auto py-4 animate-fade-in">
                                {requests.length === 0 ? (
                                    <div className="text-center py-32 opacity-20"><i className="fa-solid fa-tray-full text-8xl mb-6 text-white"></i><p className="font-black text-xl uppercase tracking-[10px] text-white">Inbox Empty</p></div>
                                ) : (
                                    requests.map(req => (
                                        <div key={req.id} className="bg-slate-800/40 border border-slate-700 rounded-[2.5rem] p-8 animate-message-pop">
                                            <div className="flex gap-6 items-center mb-6">
                                                <div className="w-16 h-16 rounded-2xl bg-brand-500 overflow-hidden shadow-lg">
                                                    <img src={req.sender_profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-black text-xl italic tracking-tighter">@{req.sender_profile?.username}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Invited you to walk</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-950 p-5 rounded-2xl mb-8 text-sm text-slate-300 border-l-4 border-brand-500 italic shadow-inner">
                                                "{req.message || "Namaste, let's walk together!"}"
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => handleRespond(req, 'accepted')} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest">Accept</button>
                                                <button onClick={() => handleRespond(req, 'declined')} className="px-8 bg-slate-800 text-slate-500 font-black py-4 rounded-2xl text-xs uppercase tracking-widest">Ignore</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {view === 'my-buddies' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
                                {buddies.length === 0 ? (
                                    <div className="col-span-full py-40 text-center opacity-20"><i className="fa-solid fa-user-astronaut text-8xl mb-6 text-white"></i><p className="font-black text-xl uppercase tracking-[8px] text-white">No Squad Yet</p></div>
                                ) : (
                                    buddies.map(buddy => (
                                        <div key={buddy.id} onClick={() => openBuddyProfile(buddy)} className="bg-slate-800/40 border border-slate-700 rounded-[2.5rem] p-6 flex items-center gap-6 cursor-pointer hover:bg-slate-800 transition-all group">
                                            <div className="relative">
                                                <div className="w-20 h-20 rounded-2xl bg-brand-500 overflow-hidden shadow-2xl border-4 border-slate-800">
                                                    <img src={buddy.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-slate-900 rounded-full animate-pulse"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-black text-xl italic tracking-tighter group-hover:text-brand-400 transition-colors">@{buddy.username}</h4>
                                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{buddy.name}</span>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-600 group-hover:text-brand-500 transition-colors flex items-center justify-center">
                                                <i className="fa-solid fa-chevron-right text-xl"></i>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {view === 'chat' && selectedBuddy && (
                            <BuddyChat userId={profile.id!} buddy={selectedBuddy} onBack={() => setView('my-buddies')} />
                        )}

                        {view === 'settings' && (
                            <div className="max-w-xl mx-auto space-y-10 py-4 animate-fade-in">
                                <div className="bg-brand-600/10 border-2 border-brand-500/20 p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl relative overflow-hidden">
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-3xl shadow-lg shadow-brand-500/30">
                                            <i className="fa-solid fa-earth-asia"></i>
                                        </div>
                                        <div>
                                            <span className="text-xl text-white font-black block">Discoverable</span>
                                            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">Others find @{profile.username}</span>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer scale-125">
                                        <input type="checkbox" checked={isLooking} onChange={(e) => setIsLooking(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                    </label>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[4px] mb-4 block ml-4">Bio</label>
                                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Introduce yourself..." className="w-full bg-slate-800/40 border-2 border-slate-800 rounded-[2rem] p-8 text-sm text-white focus:border-brand-500 outline-none h-40 resize-none transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] mb-3 block ml-4">Age</label>
                                            <input type="number" value={age} onChange={(e) => setAge(parseInt(e.target.value) || 0)} className="w-full bg-slate-800/40 border-2 border-slate-800 rounded-2xl p-4 text-sm font-black text-white outline-none focus:border-brand-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] mb-3 block ml-4">Pace</label>
                                            <select value={pace} onChange={(e) => setPace(e.target.value as any)} className="w-full bg-slate-800/40 border-2 border-slate-800 rounded-2xl p-4 text-sm font-black text-white outline-none focus:border-brand-500 cursor-pointer">
                                                <option value="slow">Slow Stroll</option>
                                                <option value="moderate">Steady Pace</option>
                                                <option value="fast">Brisk / Power</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button onClick={handleSavePrefs} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-6 rounded-3xl shadow-2xl shadow-brand-900/20 active:scale-95 transition-all text-xs uppercase tracking-[4px]">Update Discovery Deck</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <BuddyProfileModal 
                isOpen={showProfile} 
                onClose={() => setShowProfile(false)} 
                currentUserId={profile.id!} 
                buddy={selectedBuddy!} 
                onBuddyRemoved={loadData}
                onChatRequest={() => { setShowProfile(false); setView('chat'); }}
            />

            {showLiveRadar && userCoords && (
                <LiveBuddyMap 
                    connections={liveConnections} 
                    userLat={userCoords.lat} 
                    userLng={userCoords.lng} 
                    onClose={() => setShowLiveRadar(false)} 
                />
            )}
        </div>
    );
};
