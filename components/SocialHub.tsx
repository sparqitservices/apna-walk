
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, WalkingGroup, Challenge, ChallengeParticipant, GroupPost, GroupMember, GroupMemberStats, BuddyRequest, NearbyBuddy } from '../types';
import { 
  fetchGroups, createGroup, requestJoinGroup, fetchPendingRequests, approveMember, rejectMember,
  fetchChallenges, joinChallenge, fetchLeaderboard, 
  createSystemMonthlyChallenge, fetchGroupPosts, createPost,
  fetchGroupMemberStats, kickMember, subscribeToGroupPosts, leaveGroup
} from '../services/socialService';
import { 
  fetchMyBuddies, fetchMyBuddyRequests, respondToRequest, 
  findNearbyBuddies, sendBuddyRequest, updateBuddyPreferences 
} from '../services/buddyService';
import { BuddyChat } from './BuddyChat';

interface SocialHubProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const SocialHub: React.FC<SocialHubProps> = ({ isOpen, onClose, profile }) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'challenges' | 'buddies'>('groups');
  const [loading, setLoading] = useState(false);
  
  // Squads/Challenges Data
  const [groups, setGroups] = useState<WalkingGroup[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<WalkingGroup | null>(null);
  const [groupTab, setGroupTab] = useState<'feed' | 'leaderboard' | 'manage'>('feed');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeParticipant[]>([]);
  const [groupFeed, setGroupFeed] = useState<GroupPost[]>([]);
  const [groupStats, setGroupStats] = useState<GroupMemberStats[]>([]);
  const [pendingGroupReqs, setPendingGroupReqs] = useState<GroupMember[]>([]);
  
  // Buddies Data
  const [myBuddies, setMyBuddies] = useState<UserProfile[]>([]);
  const [buddyRequests, setBuddyRequests] = useState<BuddyRequest[]>([]);
  const [nearbyWalkers, setNearbyWalkers] = useState<NearbyBuddy[]>([]);
  const [buddyView, setBuddyView] = useState<'my-squad' | 'inbox' | 'explore'>('my-squad');
  const [activeChatBuddy, setActiveChatBuddy] = useState<UserProfile | null>(null);

  // Discovery Filters
  const [filterPace, setFilterPace] = useState<string>('all');
  const [filterTime, setFilterTime] = useState<string>('all');

  // UI State
  const [postContent, setPostContent] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const postScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !profile.isGuest) {
      loadData();
      createSystemMonthlyChallenge(); 
    }
  }, [isOpen, activeTab, buddyView]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'groups') {
        const g = await fetchGroups(profile.id);
        setGroups(g);
      } else if (activeTab === 'challenges') {
        const c = await fetchChallenges(profile.id);
        setChallenges(c);
      } else {
        if (buddyView === 'my-squad') {
          const b = await fetchMyBuddies(profile.id!);
          setMyBuddies(b);
        } else if (buddyView === 'inbox') {
          const r = await fetchMyBuddyRequests(profile.id!);
          setBuddyRequests(r);
        } else if (buddyView === 'explore') {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const results = await findNearbyBuddies(pos.coords.latitude, pos.coords.longitude, 10000, profile.id!);
            const scored = results.map(b => {
              let score = 0;
              if (b.pace === profile.pace) score += 40;
              if (b.preferred_time === profile.preferred_time) score += 40;
              return { ...b, match_score: Math.min(score + 20, 100) };
            }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
            setNearbyWalkers(scored);
          });
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBuddyAction = async (requestId: string, status: 'accepted' | 'declined', senderId: string) => {
    setLoading(true);
    try {
      await respondToRequest(requestId, status, senderId, profile.id!);
      setBuddyRequests(prev => prev.filter(r => r.id !== requestId));
      if (status === 'accepted') alert("New buddy added to your squad!");
    } catch (e) { alert("Action failed."); }
    setLoading(false);
  };

  const handleSendInvite = async (buddy: NearbyBuddy) => {
    const msg = prompt(`Send a message to @${buddy.username}:`, "Namaste! Let's walk together?");
    if (msg === null) return;
    try {
      await sendBuddyRequest(profile.id!, buddy.id!, msg);
      alert("Invite sent!");
      setNearbyWalkers(prev => prev.filter(n => n.id !== buddy.id));
    } catch (e) { alert("Failed to send invite."); }
  };

  const clearSelection = () => {
      setSelectedGroup(null);
      setSelectedChallenge(null);
      setActiveChatBuddy(null);
  };

  if (!isOpen) return null;

  const isDetailOpen = !!(selectedGroup || selectedChallenge || activeChatBuddy);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex items-center justify-center p-0 sm:p-4">
      <div className="bg-dark-card w-full max-w-5xl h-full sm:h-[90vh] sm:rounded-[3rem] border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
        
        {/* GLOBAL HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6 overflow-hidden">
                <div className="flex flex-col shrink-0">
                    <h2 className="text-white font-black text-xl sm:text-2xl tracking-tighter uppercase italic"><span className="text-brand-500">Apna</span>Hub</h2>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[3px] hidden sm:block">Verified Network</p>
                </div>
                <div className="flex bg-slate-800 rounded-2xl p-1 border border-slate-700 shadow-inner overflow-x-auto no-scrollbar">
                    {[
                        { id: 'groups', label: 'Squads', icon: 'fa-people-group' },
                        { id: 'buddies', label: 'Buddies', icon: 'fa-user-group' },
                        { id: 'challenges', label: 'Glory', icon: 'fa-trophy' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); clearSelection(); }} 
                            className={`px-3 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <i className={`fa-solid ${tab.icon} text-[10px]`}></i> <span className="hidden xs:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 shrink-0 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700 hover:text-white transition-all ml-2 shadow-xl active:scale-90"><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* SIDEBAR - Context Aware */}
            <div className={`w-full md:w-80 border-r border-slate-700 flex flex-col bg-slate-900/30 shrink-0 ${isDetailOpen ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-24">
                    {activeTab === 'groups' && (
                        <>
                            <button onClick={() => setShowCreateGroup(!showCreateGroup)} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-3xl text-[10px] font-black text-slate-500 hover:text-brand-500 hover:border-brand-500 transition-all uppercase tracking-[4px]"><i className="fa-solid fa-plus mr-2"></i> New Squad</button>
                            {groups.map(g => (
                                <div key={g.id} onClick={() => { setSelectedGroup(g); setGroupTab('feed'); }} className={`p-5 rounded-[2.5rem] border cursor-pointer transition-all ${selectedGroup?.id === g.id ? 'bg-brand-600 border-brand-400' : 'bg-slate-800/40 border-slate-800 hover:border-slate-600'}`}>
                                    <h4 className="font-black text-white truncate text-base italic">{g.name}</h4>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-2">{g.location}</p>
                                </div>
                            ))}
                        </>
                    )}

                    {activeTab === 'buddies' && (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 mb-6">
                                <button onClick={() => setBuddyView('my-squad')} className={`w-full text-left p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${buddyView === 'my-squad' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}><i className="fa-solid fa-user-check mr-3"></i> My Squad</button>
                                <button onClick={() => setBuddyView('inbox')} className={`w-full text-left p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all relative ${buddyView === 'inbox' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}>
                                    <i className="fa-solid fa-inbox mr-3"></i> Inbox
                                    {buddyRequests.length > 0 && <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[8px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">{buddyRequests.length}</span>}
                                </button>
                                <button onClick={() => setBuddyView('explore')} className={`w-full text-left p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${buddyView === 'explore' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}><i className="fa-solid fa-compass mr-3"></i> Explore</button>
                            </div>
                            
                            <h5 className="text-[9px] font-black text-slate-600 uppercase tracking-[4px] px-2">Active Chats</h5>
                            <div className="space-y-2">
                                {myBuddies.map(b => (
                                    <div key={b.id} onClick={() => setActiveChatBuddy(b)} className={`p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${activeChatBuddy?.id === b.id ? 'bg-slate-800 border border-brand-500/50' : 'hover:bg-slate-800/50'}`}>
                                        <div className="relative">
                                            <img src={b.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-10 h-10 rounded-xl object-cover" />
                                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-black text-xs truncate italic">@{b.username}</p>
                                            <p className="text-[8px] text-slate-500 uppercase font-bold truncate">{b.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'challenges' && challenges.map(c => (
                        <div key={c.id} onClick={() => { setSelectedChallenge(c); fetchLeaderboard(c.id).then(setLeaderboard); }} className={`p-5 rounded-[2.5rem] border cursor-pointer transition-all ${selectedChallenge?.id === c.id ? 'bg-orange-600 border-orange-400' : 'bg-slate-800/40 border-slate-800'}`}>
                            <h4 className="font-black text-white truncate text-base italic">{c.name}</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">{c.target_steps.toLocaleString()} Steps</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className={`flex-1 overflow-y-auto no-scrollbar bg-[#0a0f14]/50 relative ${isDetailOpen ? 'flex' : 'hidden md:flex'} flex-col`}>
                
                {/* Mobile-Only Context Back Button */}
                {isDetailOpen && (
                    <div className="md:hidden p-4 border-b border-slate-800 bg-slate-900 flex items-center gap-4">
                        <button onClick={clearSelection} className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center border border-white/10 active:scale-90 transition-all">
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Back to List</span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 no-scrollbar relative z-10">
                    {/* 1. BUDDIES VIEW */}
                    {activeTab === 'buddies' && !activeChatBuddy && (
                        <div className="animate-fade-in space-y-8">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase">{buddyView.replace('-', ' ')}</h3>
                                    <p className="text-brand-400 text-[10px] font-black uppercase tracking-[4px] mt-2">Personal Fitness Network</p>
                                </div>
                            </div>

                            {buddyView === 'inbox' && (
                                <div className="grid grid-cols-1 gap-4">
                                    {buddyRequests.length === 0 ? (
                                        <div className="py-20 text-center opacity-20"><i className="fa-solid fa-tray-full text-8xl mb-6"></i><p className="font-black uppercase tracking-[5px]">Inbox Empty</p></div>
                                    ) : buddyRequests.map(req => (
                                        <div key={req.id} className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-6">
                                                <img src={req.sender_profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-16 h-16 rounded-3xl border-2 border-slate-700" />
                                                <div>
                                                    <h4 className="text-white font-black text-xl italic tracking-tight">@{req.sender_profile?.username}</h4>
                                                    <p className="text-slate-400 text-xs mt-1">"{req.message || 'Chalo walk karte hain!'}"</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 shrink-0">
                                                <button onClick={() => handleBuddyAction(req.id, 'accepted', req.sender_id)} className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Accept</button>
                                                <button onClick={() => handleBuddyAction(req.id, 'declined', req.sender_id)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Ignore</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {buddyView === 'my-squad' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {myBuddies.length === 0 ? (
                                        <div className="col-span-full py-20 text-center opacity-20"><i className="fa-solid fa-user-astronaut text-8xl mb-6"></i><p className="font-black uppercase tracking-[5px]">No Buddies Yet</p></div>
                                    ) : myBuddies.map(b => (
                                        <div key={b.id} className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-slate-700 group hover:border-brand-500/30 transition-all flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <img src={b.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-16 h-16 rounded-3xl border-2 border-slate-700" />
                                                <div>
                                                    <h4 className="text-white font-black text-xl italic tracking-tight">@{b.username}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{b.name}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-[8px] bg-slate-900 px-2 py-0.5 rounded text-brand-400 font-black uppercase">{b.pace}</span>
                                                        <span className="text-[8px] bg-slate-900 px-2 py-0.5 rounded text-blue-400 font-black uppercase">{b.preferred_time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => setActiveChatBuddy(b)} className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-500 group-hover:bg-brand-600 group-hover:text-white transition-all flex items-center justify-center shadow-inner"><i className="fa-solid fa-comment-dots"></i></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {buddyView === 'explore' && (
                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-3 mb-4">
                                        <div className="bg-slate-800/40 p-1.5 rounded-2xl flex gap-2 border border-slate-700/50 shadow-inner">
                                            <span className="text-[9px] font-black text-slate-600 uppercase flex items-center px-3">Pace:</span>
                                            {['all', 'slow', 'moderate', 'fast'].map(p => (
                                                <button key={p} onClick={() => setFilterPace(p)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${filterPace === p ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>{p}</button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        {nearbyWalkers.filter(b => filterPace === 'all' || b.pace === filterPace).map(b => (
                                            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden group shadow-2xl transition-all hover:scale-[1.02]">
                                                <div className="h-32 bg-slate-800/50 relative flex items-center justify-center p-6">
                                                    <img src={b.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-20 h-20 rounded-3xl border-4 border-slate-900 object-cover shadow-2xl" />
                                                    <div className="absolute top-4 right-4 bg-brand-600 text-white font-black text-[9px] px-3 py-1 rounded-full shadow-lg border border-white/20">{b.match_score}% MATCH</div>
                                                </div>
                                                <div className="p-6 text-center">
                                                    <h4 className="text-white font-black text-2xl italic tracking-tighter">@{b.username}</h4>
                                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[3px] mt-1">Walker Nearby</p>
                                                    <div className="bg-slate-800/50 p-4 rounded-2xl my-6 text-xs text-slate-400 italic line-clamp-2 leading-relaxed">"{b.bio || 'Chalo walk par nikalte hain!'}"</div>
                                                    <button onClick={() => handleSendInvite(b)} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-[4px] text-xs">Send Namaste</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. CHAT VIEW */}
                    {activeTab === 'buddies' && activeChatBuddy && (
                        <BuddyChat userId={profile.id!} buddy={activeChatBuddy} onBack={() => setActiveChatBuddy(null)} />
                    )}

                    {/* 3. SQUADS VIEW */}
                    {activeTab === 'groups' && selectedGroup && (
                        <div className="animate-fade-in flex flex-col h-full space-y-6">
                            <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-[3.5rem] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl text-brand-500 rotate-12 pointer-events-none italic font-black">SQUAD</div>
                                <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">{selectedGroup.name}</h3>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-xs text-brand-400 font-black uppercase tracking-[3px]"><i className="fa-solid fa-map-pin"></i> {selectedGroup.location}</span>
                                </div>
                                <div className="flex gap-3 mt-8">
                                    <button onClick={() => setGroupTab('feed')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${groupTab === 'feed' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white'}`}>Feed</button>
                                    <button onClick={() => setGroupTab('leaderboard')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${groupTab === 'leaderboard' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white'}`}>Ranks</button>
                                </div>
                            </div>

                            {groupTab === 'feed' && (
                                <div className="flex-1 flex flex-col space-y-4">
                                    <div className="bg-slate-800/40 p-4 rounded-[2rem] border border-slate-700 flex gap-3">
                                        <input className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600 font-bold" placeholder="Talk to squad..." value={postContent} onChange={e => setPostContent(e.target.value)} />
                                        <button onClick={() => { createPost(selectedGroup.id, profile.id!, postContent); setPostContent(''); }} className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg"><i className="fa-solid fa-paper-plane"></i></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10 text-center opacity-30 italic text-xs">
                                        No messages in this squad feed yet.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. CHALLENGES VIEW */}
                    {activeTab === 'challenges' && selectedChallenge && (
                        <div className="animate-fade-in space-y-8">
                            <div className="bg-orange-500/10 border border-orange-500/30 p-10 rounded-[4rem]">
                                <h3 className="text-5xl font-black text-white tracking-tighter uppercase italic">{selectedChallenge.name}</h3>
                                <p className="text-orange-400 font-black text-xs uppercase tracking-[5px] mt-4">Goal: {selectedChallenge.target_steps.toLocaleString()} Steps</p>
                            </div>
                            <div className="py-20 text-center opacity-30 italic text-xs uppercase tracking-widest font-black">Challenge Leaderboard Coming Soon</div>
                        </div>
                    )}

                    {!isDetailOpen && !nearbyWalkers.length && !myBuddies.length && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                            <i className="fa-solid fa-people-arrows text-[10rem] mb-10 text-white"></i>
                            <h3 className="text-4xl font-black uppercase tracking-[15px] text-white">Social Hub</h3>
                            <p className="max-w-md mt-6 text-white text-xs font-black uppercase tracking-[6px] leading-loose">Choose a squad, buddy, or challenge to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
