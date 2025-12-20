import React, { useState, useEffect } from 'react';
import { UserProfile, WalkingGroup, Challenge, ChallengeParticipant, GroupPost, GroupMember, GroupMemberStats } from '../types';
import { 
  fetchGroups, createGroup, updateGroup, deleteGroup, 
  requestJoinGroup, fetchPendingRequests, approveMember, rejectMember,
  fetchChallenges, joinChallenge, fetchLeaderboard, 
  createSystemMonthlyChallenge, fetchGroupPosts, createPost,
  createCustomChallenge, fetchGroupMemberStats, kickMember
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
  const [groupTab, setGroupTab] = useState<'feed' | 'leaderboard' | 'members'>('feed');
  
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

  useEffect(() => {
    if (isOpen && !profile.isGuest) {
      loadData();
      createSystemMonthlyChallenge(); 
    }
  }, [isOpen, activeTab]);

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
      if(!newGroupName || !newGroupLoc) return;
      try {
          await createGroup({
              name: newGroupName,
              location: newGroupLoc,
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

  const loadGroupSubData = async (groupId: string, tab: 'feed' | 'leaderboard' | 'members') => {
      try {
          if (tab === 'feed') {
              const posts = await fetchGroupPosts(groupId);
              setGroupFeed(posts);
          } else if (tab === 'leaderboard' || tab === 'members') {
              const stats = await fetchGroupMemberStats(groupId);
              setGroupStats(stats);
          }
          if (selectedGroup?.created_by === profile.id) {
              const reqs = await fetchPendingRequests(groupId);
              setPendingRequests(reqs);
          }
      } catch (e) { console.error(e); }
  };

  const handleJoinRequest = async (gid: string) => {
      try {
          await requestJoinGroup(gid, profile.id!);
          alert('Request sent!');
          loadData();
      } catch(e) { alert('Could not send join request.'); }
  };

  const handleApprove = async (m: GroupMember) => {
      try {
          await approveMember(m.id);
          setPendingRequests(prev => prev.filter(r => r.id !== m.id));
          if (selectedGroup) loadGroupSubData(selectedGroup.id, groupTab);
          loadData();
      } catch (e) { alert("Approval failed."); }
  };

  const handleReject = async (m: GroupMember) => {
      try {
          await rejectMember(m.id);
          setPendingRequests(prev => prev.filter(r => r.id !== m.id));
          loadData();
      } catch (e) { alert("Rejection failed."); }
  };

  const handlePost = async () => {
      if(!postContent.trim() || !selectedGroup) return;
      try {
          await createPost(selectedGroup.id, profile.id!, postContent);
          setPostContent('');
          loadGroupSubData(selectedGroup.id, 'feed');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-5xl h-[90vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
        
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-white font-black text-xl tracking-tighter"><span className="text-brand-500">Apna</span>Hub</h2>
                <div className="flex bg-slate-800 rounded-full p-1 border border-slate-700">
                    <button onClick={() => { setActiveTab('groups'); setSelectedGroup(null); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'groups' ? 'bg-brand-600 text-white shadow' : 'text-slate-400'}`}>Groups</button>
                    <button onClick={() => { setActiveTab('challenges'); setSelectedChallenge(null); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'challenges' ? 'bg-orange-500 text-white shadow' : 'text-slate-400'}`}>Challenges</button>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={loadData} className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700"><i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i></button>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700"><i className="fa-solid fa-xmark"></i></button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            <div className={`w-full md:w-80 border-r border-slate-700 flex flex-col bg-slate-900/30 ${selectedGroup || selectedChallenge ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    {activeTab === 'groups' ? (
                        <>
                            <button onClick={() => setShowCreateGroup(!showCreateGroup)} className="w-full py-3 border-2 border-dashed border-slate-700 rounded-2xl text-xs font-black text-slate-500 hover:text-brand-500 hover:border-brand-500 transition-all uppercase tracking-widest"><i className="fa-solid fa-plus mr-2"></i> New Squad</button>
                            {showCreateGroup && (
                                <div className="bg-slate-800 p-4 rounded-2xl space-y-3 animate-fade-in border border-brand-500/30">
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-500" placeholder="Group Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-500" placeholder="Location" value={newGroupLoc} onChange={e => setNewGroupLoc(e.target.value)} />
                                    <button onClick={handleCreateGroup} className="w-full bg-brand-600 text-white py-2 rounded-xl text-xs font-bold uppercase">Create</button>
                                </div>
                            )}
                            {groups.map(g => (
                                <div key={g.id} onClick={() => openGroup(g)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedGroup?.id === g.id ? 'bg-brand-600 border-brand-400 shadow-xl' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'}`}>
                                    <h4 className="font-black text-white truncate text-sm">{g.name}</h4>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold"><i className="fa-solid fa-location-dot mr-1"></i> {g.location}</span>
                                        <span className="text-[10px] bg-black/20 text-white px-2 py-0.5 rounded-full font-black">{g.member_count} Members</span>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        challenges.map(c => (
                            <div key={c.id} onClick={() => openChallenge(c)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedChallenge?.id === c.id ? 'bg-orange-600 border-orange-400 shadow-xl' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'}`}>
                                <h4 className="font-black text-white truncate text-sm">{c.name}</h4>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold"><i className="fa-solid fa-flag-checkered mr-1"></i> {c.target_steps.toLocaleString()} Steps</span>
                                    <span className="text-[10px] bg-black/20 text-white px-2 py-0.5 rounded-full font-black">{c.participant_count} Joined</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar bg-slate-900/10">
                {selectedGroup ? (
                    <div className="space-y-6 animate-fade-in h-full flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setSelectedGroup(null)} className="md:hidden w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center"><i className="fa-solid fa-chevron-left"></i></button>
                            <div className="flex-1 ml-4 md:ml-0">
                                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">{selectedGroup.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest"><i className="fa-solid fa-location-dot mr-1"></i> {selectedGroup.location}</p>
                            </div>
                            {!selectedGroup.is_member && !selectedGroup.is_pending && (
                                <button onClick={() => handleJoinRequest(selectedGroup.id)} className="bg-brand-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">Request to Join</button>
                            )}
                        </div>

                        <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700 shrink-0">
                            {['feed', 'leaderboard', 'members'].map(t => (
                                <button key={t} onClick={() => { setGroupTab(t as any); loadGroupSubData(selectedGroup.id, t as any); }} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${groupTab === t ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                            ))}
                        </div>

                        <div className="flex-1 min-h-0">
                            {groupTab === 'feed' && (
                                <div className="space-y-4 h-full flex flex-col">
                                    {selectedGroup.is_member && (
                                        <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700 flex gap-3 shadow-inner">
                                            <input className="flex-1 bg-transparent text-sm text-white outline-none" placeholder="Share something with the squad..." value={postContent} onChange={e => setPostContent(e.target.value)} />
                                            <button onClick={handlePost} className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"><i className="fa-solid fa-paper-plane"></i></button>
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
                                        {groupFeed.map(post => (
                                            <div key={post.id} className="bg-slate-800/20 border border-slate-700 p-4 rounded-3xl animate-message-pop">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <img src={post.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-8 h-8 rounded-full border border-slate-600" />
                                                    <div>
                                                        <p className="text-xs font-black text-white italic">@{post.profile?.username}</p>
                                                        <p className="text-[8px] text-slate-500 uppercase font-bold">{new Date(post.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">{post.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {groupTab === 'leaderboard' && (
                                <div className="space-y-3 overflow-y-auto h-full no-scrollbar">
                                    {groupStats.map((s, idx) => (
                                        <div key={s.id} className="bg-slate-800/30 p-4 rounded-[2rem] flex items-center gap-4 border border-slate-700/50 group hover:border-brand-500/30 transition-all">
                                            <div className="w-8 text-center font-black text-slate-600 group-hover:text-brand-500 italic text-xl">#{idx + 1}</div>
                                            <img src={s.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-12 h-12 rounded-2xl border-2 border-slate-700" />
                                            <div className="flex-1">
                                                <h4 className="text-white font-black text-base italic tracking-tighter">@{s.profile?.username}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.role}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-brand-400 tabular-nums">{s.today_steps.toLocaleString()}</div>
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Steps Today</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {groupTab === 'members' && (
                                <div className="space-y-4">
                                    {selectedGroup.created_by === profile.id && pendingRequests.length > 0 && (
                                        <div className="bg-brand-500/5 border border-brand-500/20 p-5 rounded-3xl">
                                            <h5 className="text-brand-400 text-xs font-black uppercase tracking-[3px] mb-4">Pending Access</h5>
                                            <div className="space-y-3">
                                                {pendingRequests.map(req => (
                                                    <div key={req.id} className="bg-slate-900/50 p-3 rounded-2xl flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <img src={req.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-8 h-8 rounded-full" />
                                                            <span className="text-white font-bold text-xs">@{req.profile?.username}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleApprove(req)} className="w-8 h-8 bg-brand-600 text-white rounded-lg flex items-center justify-center shadow-lg"><i className="fa-solid fa-check text-xs"></i></button>
                                                            <button onClick={() => handleReject(req)} className="w-8 h-8 bg-slate-800 text-slate-400 rounded-lg flex items-center justify-center"><i className="fa-solid fa-xmark text-xs"></i></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {groupStats.map(s => (
                                            <div key={s.id} className="bg-slate-800/40 p-3 rounded-2xl flex items-center gap-3 border border-slate-700">
                                                <img src={s.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-10 h-10 rounded-xl" />
                                                <div className="min-w-0">
                                                    <p className="text-white font-black truncate text-xs">@{s.profile?.username}</p>
                                                    <p className="text-[8px] text-slate-500 uppercase font-black">{s.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : selectedChallenge ? (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-6">
                                <button onClick={() => setSelectedChallenge(null)} className="md:hidden w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center"><i className="fa-solid fa-chevron-left"></i></button>
                                <div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic drop-shadow-lg">{selectedChallenge.name}</h3>
                                    <p className="text-orange-400 font-black text-xs uppercase tracking-[4px] mt-1">Goal: {selectedChallenge.target_steps.toLocaleString()} Steps</p>
                                </div>
                            </div>
                            {!selectedChallenge.is_joined && (
                                <button onClick={() => handleJoinChallenge(selectedChallenge.id)} className="bg-orange-500 hover:bg-orange-400 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95">Accept Challenge</button>
                            )}
                        </div>
                        <div className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-slate-700 shadow-inner">
                            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-3"><i className="fa-solid fa-ranking-star text-orange-500"></i> Local Leaderboard</h4>
                            <div className="space-y-3">
                                {leaderboard.map((p, idx) => (
                                    <div key={p.user_id} className="bg-slate-900/60 p-4 rounded-3xl flex items-center gap-5 border border-slate-800 hover:border-orange-500/20 transition-all">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black italic text-lg ${idx === 0 ? 'bg-yellow-500 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{idx + 1}</div>
                                        <img src={p.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-12 h-12 rounded-2xl border-2 border-slate-700 object-cover" />
                                        <div className="flex-1">
                                            <h5 className="text-white font-black text-lg italic tracking-tight">@{p.profile?.username}</h5>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden max-w-[150px]">
                                                <div className="h-full bg-orange-500" style={{ width: `${Math.min((p.current_steps / selectedChallenge.target_steps) * 100, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-white tabular-nums">{p.current_steps.toLocaleString()}</div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Total Steps</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <i className={`fa-solid ${activeTab === 'groups' ? 'fa-people-group' : 'fa-medal'} text-9xl mb-8 text-white`}></i>
                        <h3 className="text-3xl font-black uppercase tracking-[10px] text-white">Select One</h3>
                        <p className="max-w-xs mt-4 text-white text-sm font-bold uppercase tracking-widest leading-loose">Choose a {activeTab === 'groups' ? 'walking squad' : 'global challenge'} from the sidebar to view details and live stats!</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};