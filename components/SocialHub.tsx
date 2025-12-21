
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, WalkingGroup, Challenge, ChallengeParticipant, GroupPost, GroupMember, GroupMemberStats } from '../types';
import { 
  fetchGroups, createGroup, updateGroup, deleteGroup, 
  requestJoinGroup, fetchPendingRequests, approveMember, rejectMember,
  fetchChallenges, joinChallenge, fetchLeaderboard, 
  createSystemMonthlyChallenge, fetchGroupPosts, createPost,
  fetchGroupMemberStats, kickMember, subscribeToGroupPosts, leaveGroup
} from '../services/socialService';

interface SocialHubProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const SocialHub: React.FC<SocialHubProps> = ({ isOpen, onClose, profile }) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'challenges'>('groups');
  const [loading, setLoading] = useState(false);
  
  // Data
  const [groups, setGroups] = useState<WalkingGroup[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<WalkingGroup | null>(null);
  const [groupTab, setGroupTab] = useState<'feed' | 'leaderboard' | 'manage'>('feed');
  
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeParticipant[]>([]);
  const [groupFeed, setGroupFeed] = useState<GroupPost[]>([]);
  const [groupStats, setGroupStats] = useState<GroupMemberStats[]>([]);
  const [pendingRequests, setPendingRequests] = useState<GroupMember[]>([]);
  const [postContent, setPostContent] = useState('');

  // Management UI
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLoc, setNewGroupLoc] = useState('');
  const postScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !profile.isGuest) {
      loadData();
      createSystemMonthlyChallenge(); 
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (selectedGroup && groupTab === 'feed') {
        const channel = subscribeToGroupPosts(selectedGroup.id, (post) => {
            setGroupFeed(prev => [post, ...prev]);
            if (navigator.vibrate) navigator.vibrate(10);
        });
        return () => { channel.unsubscribe(); };
    }
  }, [selectedGroup?.id, groupTab]);

  useEffect(() => {
    if (postScrollRef.current) {
        postScrollRef.current.scrollTop = 0;
    }
  }, [groupFeed]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'groups') {
        const g = await fetchGroups(profile.id);
        setGroups(g);
      } else {
        const c = await fetchChallenges(profile.id);
        setChallenges(c);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreateGroup = async () => {
      if(!newGroupName || !newGroupName.trim()) return;
      try {
          await createGroup({
              name: newGroupName,
              location: newGroupLoc || 'Local',
              created_by: profile.id,
              description: 'Local walking squad.',
              privacy: 'public'
          });
          setShowCreateGroup(false);
          setNewGroupName('');
          setNewGroupLoc('');
          loadData();
      } catch (e) { alert('Failed to create group.'); }
  };

  const openGroup = async (group: WalkingGroup) => {
      setSelectedGroup(group);
      setGroupTab('feed');
      loadGroupSubData(group.id, 'feed');
  };

  const loadGroupSubData = async (groupId: string, tab: 'feed' | 'leaderboard' | 'manage') => {
      try {
          if (tab === 'feed') {
              const posts = await fetchGroupPosts(groupId);
              setGroupFeed(posts);
          } else if (tab === 'leaderboard' || tab === 'manage') {
              const stats = await fetchGroupMemberStats(groupId);
              setGroupStats(stats);
          }
          if (tab === 'manage' && selectedGroup?.created_by === profile.id) {
              const reqs = await fetchPendingRequests(groupId);
              setPendingRequests(reqs);
          }
      } catch (e) { console.error(e); }
  };

  const handleJoinRequest = async (gid: string) => {
      try {
          await requestJoinGroup(gid, profile.id!);
          alert('Chalo! Join request sent to squad leader.');
          loadData();
      } catch(e) { alert('Could not join.'); }
  };

  const handleLeaveGroup = async () => {
      if (!selectedGroup || !confirm("Squad chhodni hai? Sure?")) return;
      try {
          await leaveGroup(selectedGroup.id, profile.id!);
          setSelectedGroup(null);
          loadData();
      } catch(e) { alert("Error leaving group."); }
  };

  const handleApprove = async (m: GroupMember) => {
      try {
          await approveMember(m.id);
          setPendingRequests(prev => prev.filter(r => r.id !== m.id));
          if (selectedGroup) loadGroupSubData(selectedGroup.id, 'manage');
          loadData();
      } catch (e) { alert("Approval failed."); }
  };

  const handleReject = async (m: GroupMember) => {
      try {
          await rejectMember(m.id);
          setPendingRequests(prev => prev.filter(r => r.id !== m.id));
          if (selectedGroup) loadGroupSubData(selectedGroup.id, 'manage');
          loadData();
      } catch (e) { alert("Rejection failed."); }
  };

  const handleKick = async (mId: string) => {
      if (!confirm("Kick member?")) return;
      try {
          await kickMember(mId);
          setGroupStats(prev => prev.filter(s => s.id !== mId));
      } catch(e) { alert("Failed to kick."); }
  };

  const handlePost = async () => {
      if(!postContent.trim() || !selectedGroup) return;
      try {
          await createPost(selectedGroup.id, profile.id!, postContent);
          setPostContent('');
          // Subscription handles the UI update
      } catch (e) { alert("Couldn't post."); }
  };

  const openChallenge = async (challenge: Challenge) => {
      setSelectedChallenge(challenge);
      const lb = await fetchLeaderboard(challenge.id);
      setLeaderboard(lb);
  };

  const handleJoinChallenge = async (cid: string) => {
      try {
          await joinChallenge(cid, profile.id!);
          loadData();
          if (selectedChallenge) openChallenge(selectedChallenge);
      } catch (e) { alert('Could not join challenge.'); }
  };

  const squadPower = groupStats.reduce((acc, curr) => acc + (curr.today_steps || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-5xl h-[90vh] rounded-[3rem] border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic"><span className="text-brand-500">Apna</span>Hub</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[4px]">Local Fitness Circles</p>
                </div>
                <div className="flex bg-slate-800 rounded-2xl p-1 border border-slate-700 shadow-inner">
                    <button onClick={() => { setActiveTab('groups'); setSelectedGroup(null); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'groups' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500'}`}>Squads</button>
                    <button onClick={() => { setActiveTab('challenges'); setSelectedChallenge(null); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'challenges' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>Glory</button>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={loadData} className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700 hover:text-white transition-all"><i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i></button>
                <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700 hover:text-white hover:bg-red-500/20 transition-all"><i className="fa-solid fa-xmark"></i></button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* SIDEBAR */}
            <div className={`w-full md:w-80 border-r border-slate-700 flex flex-col bg-slate-900/30 shrink-0 ${selectedGroup || selectedChallenge ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    {activeTab === 'groups' ? (
                        <>
                            <button onClick={() => setShowCreateGroup(!showCreateGroup)} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-3xl text-[10px] font-black text-slate-500 hover:text-brand-500 hover:border-brand-500 transition-all uppercase tracking-[4px] bg-slate-800/20"><i className="fa-solid fa-plus mr-2"></i> New Squad</button>
                            {showCreateGroup && (
                                <div className="bg-slate-800 p-5 rounded-3xl space-y-4 animate-message-pop border border-brand-500/30 shadow-xl">
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3.5 text-xs text-white outline-none focus:border-brand-500 shadow-inner" placeholder="Squad Name (e.g. Malad Walkers)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3.5 text-xs text-white outline-none focus:border-brand-500 shadow-inner" placeholder="Locality (e.g. Mumbai)" value={newGroupLoc} onChange={e => setNewGroupLoc(e.target.value)} />
                                    <button onClick={handleCreateGroup} className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Form Squad</button>
                                </div>
                            )}
                            <div className="space-y-3">
                                {groups.map(g => (
                                    <div key={g.id} onClick={() => openGroup(g)} className={`p-5 rounded-[2.5rem] border cursor-pointer transition-all relative overflow-hidden group ${selectedGroup?.id === g.id ? 'bg-brand-600 border-brand-400 shadow-2xl' : 'bg-slate-800/40 border-slate-800 hover:border-slate-600'}`}>
                                        <div className="relative z-10">
                                            <h4 className="font-black text-white truncate text-base italic tracking-tight">{g.name}</h4>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-[9px] text-slate-400 font-black uppercase group-hover:text-white/60"><i className="fa-solid fa-location-dot mr-1"></i> {g.location}</span>
                                                <span className="text-[9px] bg-black/30 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wider">{g.member_count} Members</span>
                                            </div>
                                        </div>
                                        {g.is_member && <div className="absolute top-2 right-4 text-[10px] text-white/20 font-black uppercase tracking-widest">Joined</div>}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            {challenges.map(c => (
                                <div key={c.id} onClick={() => openChallenge(c)} className={`p-5 rounded-[2.5rem] border cursor-pointer transition-all group ${selectedChallenge?.id === c.id ? 'bg-orange-600 border-orange-400 shadow-2xl' : 'bg-slate-800/40 border-slate-800 hover:border-slate-600'}`}>
                                    <h4 className="font-black text-white truncate text-base italic tracking-tight">{c.name}</h4>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-[9px] text-slate-400 font-black uppercase group-hover:text-white/60"><i className="fa-solid fa-flag-checkered mr-1"></i> {c.target_steps.toLocaleString()} STEPS</span>
                                        <span className="text-[9px] bg-black/30 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wider">{c.participant_count} SLOTS</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar bg-[#0a0f14]/50 relative">
                {selectedGroup ? (
                    <div className="animate-fade-in h-full flex flex-col space-y-6">
                        
                        {/* Squad Header Card */}
                        <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-[3.5rem] relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl text-brand-500 rotate-12 pointer-events-none italic font-black">SQUAD</div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">{selectedGroup.name}</h3>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-xs text-brand-400 font-black uppercase tracking-[3px] flex items-center gap-1.5"><i className="fa-solid fa-map-pin"></i> {selectedGroup.location}</span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-xs text-slate-400 font-black uppercase tracking-[3px] flex items-center gap-1.5"><i className="fa-solid fa-users"></i> {selectedGroup.member_count} Squadies</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[4px] mb-1">Squad Power Today</p>
                                    <div className="text-4xl font-black text-brand-500 tabular-nums italic tracking-tighter">{squadPower.toLocaleString()} <small className="text-xs font-bold not-italic">STEPS</small></div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                {!selectedGroup.is_member && !selectedGroup.is_pending ? (
                                    <button onClick={() => handleJoinRequest(selectedGroup.id)} className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Request To Join</button>
                                ) : (
                                    <button onClick={handleLeaveGroup} className="bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Leave Squad</button>
                                )}
                                {selectedGroup.created_by === profile.id && (
                                    <button onClick={() => { setGroupTab('manage'); loadGroupSubData(selectedGroup.id, 'manage'); }} className="bg-white text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Admin Controls</button>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-slate-800/40 p-1.5 rounded-2xl border border-slate-700/50 shrink-0 w-fit">
                            {['feed', 'leaderboard', 'manage'].map(t => (
                                (t === 'manage' && selectedGroup.created_by !== profile.id) ? null : (
                                    <button key={t} onClick={() => { setGroupTab(t as any); loadGroupSubData(selectedGroup.id, t as any); }} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${groupTab === t ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                                )
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 min-h-0">
                            {groupTab === 'feed' && (
                                <div className="h-full flex flex-col space-y-4">
                                    {selectedGroup.is_member && (
                                        <div className="bg-slate-800/40 p-5 rounded-[2rem] border border-slate-700/50 flex gap-4 shadow-inner relative group focus-within:border-brand-500/50 transition-colors">
                                            <input className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600 font-medium" placeholder="Message the squad..." value={postContent} onChange={e => setPostContent(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePost()} />
                                            <button onClick={handlePost} className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-brand-50"><i className="fa-solid fa-paper-plane"></i></button>
                                        </div>
                                    )}
                                    <div ref={postScrollRef} className="flex-1 space-y-4 overflow-y-auto no-scrollbar pb-10">
                                        {groupFeed.map(post => {
                                            const isMe = post.user_id === profile.id;
                                            return (
                                                <div key={post.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-message-pop`}>
                                                    <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                        <div className="flex items-center gap-2 mb-1.5 px-1">
                                                            {!isMe && <img src={post.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-5 h-5 rounded-full border border-slate-600" />}
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{isMe ? 'YOU' : `@${post.profile?.username}`}</p>
                                                        </div>
                                                        <div className={`p-4 rounded-[1.5rem] text-sm shadow-xl transition-all ${isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                                            {post.content}
                                                        </div>
                                                        <span className="text-[8px] text-slate-600 font-black mt-1 px-1">{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {groupFeed.length === 0 && (
                                            <div className="py-20 text-center opacity-20"><i className="fa-solid fa-comments text-6xl mb-4"></i><p className="text-[10px] font-black uppercase tracking-[5px]">Silence in the squad...</p></div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {groupTab === 'leaderboard' && (
                                <div className="space-y-4 h-full overflow-y-auto no-scrollbar pb-10">
                                    <div className="bg-slate-800/20 rounded-[2.5rem] border border-slate-800 p-6">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[4px] mb-6 px-2 flex items-center gap-2"><i className="fa-solid fa-ranking-star text-brand-500"></i> Daily Ranks</h4>
                                        <div className="space-y-3">
                                            {groupStats.map((s, idx) => (
                                                <div key={s.id} className="bg-slate-900/40 p-5 rounded-[2rem] flex items-center gap-5 border border-slate-800 group hover:border-brand-500/30 transition-all">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black italic text-xl ${idx === 0 ? 'bg-yellow-500 text-slate-900' : idx === 1 ? 'bg-slate-400 text-slate-900' : idx === 2 ? 'bg-orange-600 text-white' : 'text-slate-600'}`}>{idx + 1}</div>
                                                    <img src={s.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-14 h-14 rounded-2xl border-2 border-slate-700 object-cover" />
                                                    <div className="flex-1">
                                                        <h4 className="text-white font-black text-lg italic tracking-tighter">@{s.profile?.username}</h4>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{s.role}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-black text-brand-400 tabular-nums italic">{s.today_steps.toLocaleString()}</div>
                                                        <p className="text-[8px] text-slate-500 font-black uppercase">Steps Today</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {groupTab === 'manage' && (
                                <div className="space-y-8 h-full overflow-y-auto no-scrollbar pb-10">
                                    {pendingRequests.length > 0 && (
                                        <div className="bg-brand-500/5 border border-brand-500/20 p-8 rounded-[3rem] shadow-xl">
                                            <h5 className="text-brand-400 text-xs font-black uppercase tracking-[4px] mb-6 flex items-center gap-2"><i className="fa-solid fa-door-open"></i> Join Requests</h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {pendingRequests.map(req => (
                                                    <div key={req.id} className="bg-slate-900/60 p-5 rounded-3xl flex items-center justify-between border border-slate-800">
                                                        <div className="flex items-center gap-4">
                                                            <img src={req.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-12 h-12 rounded-2xl border-2 border-slate-700" />
                                                            <span className="text-white font-black text-sm italic">@{req.profile?.username}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleApprove(req)} className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90"><i className="fa-solid fa-check"></i></button>
                                                            <button onClick={() => handleReject(req)} className="w-10 h-10 bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center border border-slate-700 active:scale-90"><i className="fa-solid fa-xmark"></i></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-slate-800/20 border border-slate-800 p-8 rounded-[3rem]">
                                        <h5 className="text-slate-500 text-[10px] font-black uppercase tracking-[4px] mb-6">Current Roster</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {groupStats.map(s => (
                                                <div key={s.id} className="bg-slate-900/40 p-5 rounded-3xl flex items-center justify-between border border-slate-800 group/item">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <img src={s.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-10 h-10 rounded-xl object-cover" />
                                                        <div className="min-w-0">
                                                            <p className="text-white font-black truncate text-xs">@{s.profile?.username}</p>
                                                            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{s.role}</p>
                                                        </div>
                                                    </div>
                                                    {s.user_id !== profile.id && (
                                                        <button onClick={() => handleKick(s.id)} className="w-8 h-8 rounded-lg text-slate-700 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover/item:opacity-100"><i className="fa-solid fa-user-minus text-xs"></i></button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-800 flex justify-end">
                                        <button onClick={() => { if(confirm("Permanently delete squad?")) deleteGroup(selectedGroup.id).then(() => {setSelectedGroup(null); loadData();}); }} className="px-8 py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-2xl text-[9px] font-black uppercase tracking-[3px] hover:bg-red-500 hover:text-white transition-all">Dissolve Squad</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : selectedChallenge ? (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-orange-500/10 border border-orange-500/30 p-10 rounded-[4rem] relative overflow-hidden">
                            <div className="absolute -top-6 -right-6 text-9xl font-black text-orange-500/5 rotate-12 select-none">CHALLENGE</div>
                            <div className="flex items-start justify-between relative z-10">
                                <div>
                                    <h3 className="text-5xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl">{selectedChallenge.name}</h3>
                                    <p className="text-orange-400 font-black text-xs uppercase tracking-[5px] mt-4 flex items-center gap-2"><i className="fa-solid fa-bullseye"></i> Goal: {selectedChallenge.target_steps.toLocaleString()} Steps</p>
                                    <p className="text-slate-400 text-sm mt-4 max-w-md leading-relaxed font-medium">{selectedChallenge.description}</p>
                                </div>
                                {!selectedChallenge.is_joined && (
                                    <button onClick={() => handleJoinChallenge(selectedChallenge.id)} className="bg-white hover:bg-orange-500 hover:text-white text-slate-900 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 transform hover:-translate-y-1">Accept Challenge</button>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-800/40 p-8 rounded-[3.5rem] border border-slate-700 shadow-2xl">
                            <h4 className="text-white font-black text-sm uppercase tracking-[4px] mb-8 flex items-center gap-3"><i className="fa-solid fa-ranking-star text-orange-500"></i> Global Leaderboard</h4>
                            <div className="space-y-3">
                                {leaderboard.map((p, idx) => (
                                    <div key={p.user_id} className="bg-slate-900/60 p-6 rounded-[2.5rem] flex items-center gap-6 border border-slate-800 hover:border-orange-500/20 transition-all group">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-2xl ${idx === 0 ? 'bg-yellow-500 text-slate-900 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-orange-600 text-white' : 'text-slate-600 group-hover:text-slate-400'}`}>{idx + 1}</div>
                                        <img src={p.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-16 h-16 rounded-3xl border-2 border-slate-700 object-cover shadow-lg" />
                                        <div className="flex-1">
                                            <h5 className="text-white font-black text-xl italic tracking-tight">@{p.profile?.username}</h5>
                                            <div className="h-2 w-full bg-slate-800 rounded-full mt-3 overflow-hidden max-w-[250px] shadow-inner">
                                                <div className="h-full bg-gradient-to-r from-orange-600 to-yellow-400" style={{ width: `${Math.min((p.current_steps / selectedChallenge.target_steps) * 100, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-white tabular-nums italic tracking-tighter">{p.current_steps.toLocaleString()}</div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Steps</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <i className={`fa-solid ${activeTab === 'groups' ? 'fa-people-group' : 'fa-medal'} text-[10rem] mb-10 text-white`}></i>
                        <h3 className="text-4xl font-black uppercase tracking-[15px] text-white">Select One</h3>
                        <p className="max-w-md mt-6 text-white text-xs font-black uppercase tracking-[6px] leading-loose">Choose a {activeTab === 'groups' ? 'walking squad' : 'global glory challenge'} from the sidebar to start dominating!</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
