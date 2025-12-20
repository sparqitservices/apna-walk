
import React, { useState, useEffect } from 'react';
import { UserProfile, WalkingGroup, Challenge, ChallengeParticipant, GroupPost, GroupMember, GroupMemberStats } from '../types';
import { 
  fetchGroups, createGroup, updateGroup, deleteGroup, 
  requestJoinGroup, fetchPendingRequests, approveMember, rejectMember,
  fetchChallenges, joinChallenge, fetchLeaderboard, 
  createSystemMonthlyChallenge, fetchGroupPosts, createPost,
  createCustomChallenge, inviteToChallenge, fetchGroupMemberStats, kickMember
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
  const [editGroupName, setEditGroupName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  // Custom Challenge UI
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChallengeName, setNewChallengeName] = useState('');
  const [newChallengeDesc, setNewChallengeDesc] = useState('');
  const [newChallengeTarget, setNewChallengeTarget] = useState(50000);
  const [newChallengeDuration, setNewChallengeDuration] = useState(7); // Days
  const [inviteId, setInviteId] = useState('');
  const [invitedList, setInvitedList] = useState<string[]>([]);

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
      if(!newGroupName || !newGroupLoc) return;
      try {
          await createGroup({
              name: newGroupName,
              location: newGroupLoc,
              created_by: profile.id,
              description: 'A dedicated group of walkers.',
              privacy: 'public'
          });
          setShowCreateGroup(false);
          setNewGroupName('');
          setNewGroupLoc('');
          loadData();
      } catch (e) {
          alert('Failed to create group. Check your connection.');
      }
  };

  const handleCreateChallenge = async () => {
      if (!newChallengeName) return;
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + newChallengeDuration);

      try {
          await createCustomChallenge({
              name: newChallengeName,
              description: newChallengeDesc || "A custom community challenge!",
              target_steps: newChallengeTarget,
              type: 'custom',
              start_date: today.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0]
          }, profile.id!, invitedList);
          
          setShowCreateChallenge(false);
          setNewChallengeName('');
          setNewChallengeDesc('');
          setNewChallengeTarget(50000);
          setNewChallengeDuration(7);
          setInvitedList([]);
          loadData();
          alert("Challenge created successfully! Friends have been invited.");
      } catch (e) {
          alert("Failed to create challenge. Check your connection.");
      }
  };

  const handleAddInvite = () => {
      const trimmed = inviteId.trim();
      if (!trimmed) return;
      if (invitedList.includes(trimmed)) return;
      if (trimmed === profile.id) {
          alert("You are already joined automatically!");
          return;
      }
      setInvitedList([...invitedList, trimmed]);
      setInviteId('');
  };

  const removeInvited = (id: string) => {
      setInvitedList(invitedList.filter(i => i !== id));
  };

  const handleUpdateGroup = async () => {
      if (!selectedGroup || !editGroupName.trim()) return;
      try {
          const updated = await updateGroup(selectedGroup.id, { name: editGroupName });
          setSelectedGroup(prev => prev ? { ...prev, name: updated.name } : null);
          setGroups(prev => prev.map(g => g.id === updated.id ? { ...g, name: updated.name } : g));
          setShowSettings(false);
          alert("Group name updated!");
      } catch (e) { alert("Failed to update group."); }
  };

  const handleDeleteGroup = async () => {
      if (!selectedGroup || !confirm("Are you sure you want to delete this group forever?")) return;
      try {
          await deleteGroup(selectedGroup.id);
          setSelectedGroup(null);
          loadData();
          alert("Group deleted.");
      } catch (e) { alert("Failed to delete group."); }
  };

  const handleJoinRequest = async (gid: string) => {
      try {
          await requestJoinGroup(gid, profile.id!);
          alert('Request sent! Please wait for the owner to approve you.');
          setGroups(prev => prev.map(g => g.id === gid ? { ...g, is_pending: true } : g));
          if (selectedGroup?.id === gid) {
              setSelectedGroup(prev => prev ? { ...prev, is_pending: true } : null);
          }
          loadData();
      } catch(e: any) { 
          alert(`Could not send join request. ${e?.message || "Check your connection."}`); 
          console.error("Join group error:", e);
      }
  };

  const openGroup = async (group: WalkingGroup) => {
      setSelectedGroup(group);
      setEditGroupName(group.name);
      setShowSettings(false);
      setShowRequests(false);
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
      } catch (e) {
          console.error("Error loading group sub data", e);
      }
  };

  const handleApprove = async (m: GroupMember) => {
      try {
          await approveMember(m.id);
          setPendingRequests(prev => prev.filter(r => r.id !== m.id));
          setGroups(prev => prev.map(g => g.id === selectedGroup?.id ? { ...g, member_count: (g.member_count || 0) + 1 } : g));
          if (selectedGroup) {
              setSelectedGroup(prev => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : null);
              loadGroupSubData(selectedGroup.id, groupTab);
          }
          alert(`${m.profile?.full_name} is now a member!`);
          loadData();
      } catch (e) { alert("Approval failed."); }
  };

  const handleReject = async (m: GroupMember) => {
    try {
        await rejectMember(m.id);
        setPendingRequests(prev => prev.filter(r => r.id !== m.id));
        alert(`Request rejected.`);
    } catch (e) { alert("Rejection failed."); }
  };

  const handleKick = async (m: GroupMemberStats) => {
    if (!confirm(`Are you sure you want to remove ${m.profile?.full_name} from the group?`)) return;
    try {
        await kickMember(m.id);
        setGroupStats(prev => prev.filter(s => s.id !== m.id));
        setGroups(prev => prev.map(g => g.id === selectedGroup?.id ? { ...g, member_count: (g.member_count || 0) - 1 } : g));
        if (selectedGroup) {
            setSelectedGroup(prev => prev ? { ...prev, member_count: (prev.member_count || 0) - 1 } : null);
        }
        alert("Member removed.");
    } catch (e) { alert("Failed to remove member."); }
  };

  const handlePost = async () => {
      if(!postContent.trim() || !selectedGroup) return;
      try {
          await createPost(selectedGroup.id, profile.id!, postContent);
          setPostContent('');
          loadGroupSubData(selectedGroup.id, 'feed');
      } catch (e) {
          alert("Couldn't post. Check connection.");
      }
  };

  const openChallenge = async (challenge: Challenge) => {
      setSelectedChallenge(challenge);
      try {
          const lb = await fetchLeaderboard(challenge.id);
          setLeaderboard(lb);
      } catch (e) {
          setLeaderboard([]);
      }
  };

  const handleJoinChallenge = async (cid: string) => {
      try {
          await joinChallenge(cid, profile.id!);
          alert("Shabaash! You've joined the challenge. Step high!");
          loadData();
          setChallenges(prev => prev.map(c => c.id === cid ? { ...c, is_joined: true, participant_count: (c.participant_count || 0) + 1 } : c));
          if (selectedChallenge?.id === cid) {
              setSelectedChallenge(prev => prev ? { ...prev, is_joined: true } : null);
              openChallenge(selectedChallenge!);
          }
      } catch (e) { alert('Could not join challenge.'); }
  };

  if (!isOpen) return null;

  if (profile.isGuest) {
      return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="bg-dark-card w-full max-w-sm rounded-3xl p-8 text-center border border-slate-700 shadow-2xl animate-message-pop">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
                    <i className="fa-solid fa-users-slash text-4xl text-slate-500"></i>
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Community Hub</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    Social features like Groups and Challenges require a verified account. Sign in to walk with your friends!
                </p>
                <button onClick={onClose} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95">Back to Home</button>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-5xl h-[90vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 shrink-0 gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <h2 className="text-white font-black text-xl tracking-tighter"><span className="text-brand-500">Apna</span>Hub</h2>
                <div className="flex bg-slate-800 rounded-full p-1 border border-slate-700 shadow-inner">
                    <button 
                        onClick={() => { setActiveTab('groups'); setSelectedGroup(null); setSelectedChallenge(null); }} 
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'groups' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >Groups</button>
                    <button 
                        onClick={() => { setActiveTab('challenges'); setSelectedGroup(null); setSelectedChallenge(null); }} 
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'challenges' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >Challenges</button>
                </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
                <button onClick={loadData} className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700">
                    <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
                </button>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
            
            {/* List Sidebar */}
            <div className={`w-full md:w-80 border-r border-slate-700 flex flex-col bg-slate-900/30 ${selectedGroup || selectedChallenge ? 'hidden md:flex' : 'flex'}`}>
                {activeTab === 'groups' ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                        <button 
                            onClick={() => setShowCreateGroup(!showCreateGroup)} 
                            className={`w-full py-4 border-2 border-dashed rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${showCreateGroup ? 'bg-brand-500/10 border-brand-500 text-brand-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-brand-500 hover:text-brand-500'}`}
                        >
                            <i className={`fa-solid ${showCreateGroup ? 'fa-minus' : 'fa-plus'}`}></i> {showCreateGroup ? 'Cancel Group' : 'New Group'}
                        </button>
                        
                        {showCreateGroup && (
                            <div className="bg-slate-800 p-4 rounded-2xl animate-fade-in border border-brand-500/30 shadow-xl space-y-3">
                                <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-2">Group Details</h5>
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none" placeholder="Catchy Name (e.g. Raftaar Boys)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none" placeholder="Your City" value={newGroupLoc} onChange={e => setNewGroupLoc(e.target.value)} />
                                <button onClick={handleCreateGroup} disabled={!newGroupName || !newGroupLoc} className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-black transition-all shadow-lg">Start Group</button>
                            </div>
                        )}

                        {groups.map(g => (
                            <div key={g.id} onClick={() => openGroup(g)} className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${selectedGroup?.id === g.id ? 'bg-brand-600 border-brand-400 shadow-xl' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`font-black text-base truncate ${selectedGroup?.id === g.id ? 'text-white' : 'text-slate-100'}`}>{g.name}</h4>
                                    {g.is_member && <i className="fa-solid fa-circle-check text-brand-400 bg-white rounded-full"></i>}
                                    {g.is_pending && <i className="fa-solid fa-clock text-yellow-500"></i>}
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${selectedGroup?.id === g.id ? 'text-brand-100' : 'text-slate-400'}`}><i className="fa-solid fa-location-dot mr-1"></i> {g.location}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${selectedGroup?.id === g.id ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'}`}>{g.member_count} Members</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                        <button onClick={() => setShowCreateChallenge(!showCreateChallenge)} className={`w-full py-4 border-2 border-dashed rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${showCreateChallenge ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-orange-500 hover:text-orange-500'}`}>
                            <i className={`fa-solid ${showCreateChallenge ? 'fa-minus' : 'fa-plus'}`}></i> {showCreateChallenge ? 'Cancel' : 'New Challenge'}
                        </button>
                        
                        {showCreateChallenge && (
                            <div className="bg-slate-800 p-5 rounded-3xl animate-fade-in border border-orange-500/30 shadow-2xl space-y-4">
                                <h5 className="text-white text-xs font-black uppercase tracking-widest mb-1 text-center">Customize Challenge</h5>
                                
                                <div className="space-y-3">
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none" placeholder="Challenge Name" value={newChallengeName} onChange={e => setNewChallengeName(e.target.value)} />
                                    <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none h-20 resize-none" placeholder="Goal/Description (e.g. Morning 5k for a week!)" value={newChallengeDesc} onChange={e => setNewChallengeDesc(e.target.value)} />
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Target Steps</label>
                                            <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none" value={newChallengeTarget} onChange={e => setNewChallengeTarget(parseInt(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Days</label>
                                            <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none" value={newChallengeDuration} onChange={e => setNewChallengeDuration(parseInt(e.target.value))} min="1" max="30" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-slate-700 pt-3">
                                    <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Invite Friends (IDs)</label>
                                    <div className="flex gap-2">
                                        <input className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none" placeholder="Paste Profile ID" value={inviteId} onChange={e => setInviteId(e.target.value)} />
                                        <button onClick={handleAddInvite} className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-xl transition-all"><i className="fa-solid fa-user-plus"></i></button>
                                    </div>
                                    
                                    {invitedList.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {invitedList.map(id => (
                                                <span key={id} className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1">
                                                    {id.substring(0, 8)}...
                                                    <button onClick={() => removeInvited(id)} className="hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleCreateChallenge} disabled={!newChallengeName} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-30 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">Launch Challenge</button>
                            </div>
                        )}

                        {challenges.map(c => (
                            <div key={c.id} onClick={() => openChallenge(c)} className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden ${selectedChallenge?.id === c.id ? 'bg-orange-600 border-orange-400 shadow-xl' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'}`}>
                                <span className={`text-[9px] uppercase font-black tracking-[2px] ${selectedChallenge?.id === c.id ? 'text-orange-200' : 'text-orange-400'}`}>{c.type}</span>
                                <h4 className={`font-black text-base mt-1 leading-tight ${selectedChallenge?.id === c.id ? 'text-white' : 'text-slate-100'}`}>{c.name}</h4>
                                <div className="flex justify-between items-center mt-4">
                                    <span className={`text-[10px] font-bold ${selectedChallenge?.id === c.id ? 'text-orange-100' : 'text-slate-400'}`}><i className="fa-solid fa-shoe-prints mr-1"></i> {(c.target_steps / 1000)}k Target</span>
                                    {c.is_joined && <span className="text-[9px] font-black bg-white text-orange-600 px-2 py-0.5 rounded-full shadow-sm">JOINED</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail View */}
            <div className={`flex-1 flex flex-col bg-slate-900/50 relative ${!selectedGroup && !selectedChallenge ? 'hidden md:flex' : 'flex'}`}>
                {activeTab === 'groups' && selectedGroup ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                        <div className="p-6 bg-slate-800 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedGroup(null)} className="md:hidden w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center"><i className="fa-solid fa-arrow-left text-xs"></i></button>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black uppercase text-brand-400 tracking-widest bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">Walking Squad</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-white leading-none">{selectedGroup.name}</h2>
                                    <p className="text-slate-400 text-xs mt-1 font-medium"><i className="fa-solid fa-map-pin text-brand-500 mr-1"></i> {selectedGroup.location}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {selectedGroup.created_by === profile.id && (
                                    <div className="flex gap-2 mr-2">
                                        <button onClick={() => { setShowRequests(!showRequests); setShowSettings(false); }} className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center relative"><i className="fa-solid fa-user-plus"></i>{pendingRequests.length > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-slate-800">{pendingRequests.length}</div>}</button>
                                        <button onClick={() => { setShowSettings(!showSettings); setShowRequests(false); }} className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center"><i className="fa-solid fa-gear"></i></button>
                                    </div>
                                )}
                                {!selectedGroup.is_member && !selectedGroup.is_pending && <button onClick={() => handleJoinRequest(selectedGroup.id)} className="flex-1 sm:flex-none bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg active:scale-95">Join Group</button>}
                                {selectedGroup.is_pending && <div className="flex-1 sm:flex-none bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-2.5 rounded-xl font-black text-xs">Pending Approval</div>}
                            </div>
                        </div>

                        {/* Group Tabs */}
                        <div className="flex border-b border-slate-700 bg-slate-800/30">
                            {[
                                { id: 'feed', icon: 'fa-comments', label: 'Feed' },
                                { id: 'leaderboard', icon: 'fa-ranking-star', label: 'Stats' },
                                { id: 'members', icon: 'fa-users', label: 'Squad' }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => { setGroupTab(tab.id as any); loadGroupSubData(selectedGroup.id, tab.id as any); }}
                                    className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${groupTab === tab.id ? 'border-brand-500 text-brand-400 bg-brand-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                                >
                                    <i className={`fa-solid ${tab.icon} mr-2`}></i> {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-24 relative bg-dark-bg/20">
                            {/* Management Overlays */}
                            {showSettings && selectedGroup.created_by === profile.id && (
                                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm p-6 animate-fade-in space-y-6">
                                    <div className="flex justify-between items-center"><h4 className="text-white font-black text-lg uppercase tracking-widest">Group Settings</h4><button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button></div>
                                    <div className="space-y-4">
                                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Group Name</label><input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-brand-500" /></div>
                                        <button onClick={handleUpdateGroup} className="w-full bg-brand-600 text-white py-3 rounded-xl font-black text-sm active:scale-95 shadow-lg">Update Name</button>
                                        <div className="pt-6 border-t border-slate-800"><p className="text-xs text-slate-500 mb-4">Danger Zone</p><button onClick={handleDeleteGroup} className="w-full border border-red-500/50 text-red-500 py-3 rounded-xl text-sm font-black hover:bg-red-500 hover:text-white transition-all">Delete Group Permanently</button></div>
                                    </div>
                                </div>
                            )}

                            {showRequests && selectedGroup.created_by === profile.id && (
                                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm p-6 animate-fade-in space-y-6 overflow-y-auto">
                                    <div className="flex justify-between items-center"><h4 className="text-white font-black text-lg uppercase tracking-widest">Pending Requests</h4><button onClick={() => setShowRequests(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button></div>
                                    {pendingRequests.length === 0 ? <div className="text-center py-20 opacity-30"><i className="fa-solid fa-ghost text-4xl mb-2 block"></i><p className="text-xs font-bold uppercase">No pending requests</p></div> : (
                                        <div className="space-y-3">{pendingRequests.map(m => (
                                            <div key={m.id} className="bg-slate-800 p-4 rounded-2xl flex items-center justify-between animate-message-pop border border-slate-700 shadow-xl">
                                                <div className="flex items-center gap-3"><img src={m.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-10 h-10 rounded-full border border-slate-600" /><span className="text-white font-black text-sm">{m.profile?.full_name}</span></div>
                                                <div className="flex gap-2"><button onClick={() => handleApprove(m)} className="bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-black active:scale-95">Approve</button><button onClick={() => handleReject(m)} className="bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-black active:scale-95">Reject</button></div>
                                            </div>
                                        ))}</div>
                                    )}
                                </div>
                            )}

                            {groupTab === 'feed' ? (
                                <div className="space-y-6">
                                    {groupFeed.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 py-20"><i className="fa-solid fa-comments text-5xl mb-4"></i><p className="font-bold uppercase tracking-widest text-xs">Start the conversation!</p></div> : groupFeed.map(post => {
                                        const isMe = post.user_id === profile.id;
                                        return (
                                            <div key={post.id} className={`flex gap-3 animate-message-pop ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <div className="w-10 h-10 rounded-2xl bg-slate-800 shrink-0 overflow-hidden border border-slate-700 shadow-lg">
                                                    {post.profile?.avatar_url ? <img src={post.profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-white font-black">{post.profile?.full_name?.charAt(0) || 'U'}</div>}
                                                </div>
                                                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {!isMe && <span className="text-[10px] font-black text-slate-500 mb-1 ml-1 uppercase tracking-widest">{post.profile?.full_name}</span>}
                                                    <div className={`p-4 rounded-2xl shadow-xl text-sm leading-relaxed ${isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>{post.content}</div>
                                                    <span className="text-[8px] text-slate-500 mt-1 uppercase font-black tracking-[2px] px-1">{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : groupTab === 'leaderboard' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-white font-black text-lg flex items-center gap-2 uppercase tracking-tighter">Today's Rankings</h3>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Squad</span>
                                    </div>
                                    {groupStats.map((s, idx) => {
                                        const isMe = s.user_id === profile.id;
                                        const maxSteps = groupStats[0]?.today_steps || 1;
                                        return (
                                            <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all animate-message-pop ${isMe ? 'bg-brand-600/10 border-brand-500 shadow-lg scale-[1.02]' : 'bg-slate-800/40 border-slate-700/50'}`}>
                                                <div className={`w-8 h-8 flex items-center justify-center font-black rounded-xl shrink-0 text-sm ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-500'}`}>{idx + 1}</div>
                                                <img src={s.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-10 h-10 rounded-full border-2 border-slate-700 object-cover" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <h4 className={`font-black text-sm truncate ${isMe ? 'text-white' : 'text-slate-200'}`}>{s.profile?.full_name}</h4>
                                                        <div className="text-right"><div className={`text-sm font-black ${isMe ? 'text-brand-400' : 'text-white'}`}>{s.today_steps.toLocaleString()}</div></div>
                                                    </div>
                                                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-brand-500" style={{ width: `${(s.today_steps / maxSteps) * 100}%` }}></div></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {groupStats.map((s) => (
                                        <div key={s.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <img src={s.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-12 h-12 rounded-2xl border-2 border-slate-700 object-cover" />
                                                <div>
                                                    <h4 className="text-white font-black text-sm">{s.profile?.full_name}</h4>
                                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{s.role === 'admin' ? 'Squad Captain' : 'Walker'}</p>
                                                </div>
                                            </div>
                                            {selectedGroup.created_by === profile.id && s.user_id !== profile.id && (
                                                <button onClick={() => handleKick(s)} className="text-[10px] font-black text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">Remove</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedGroup.is_member && groupTab === 'feed' && (
                            <div className="absolute bottom-6 left-6 right-6 flex gap-3 p-3 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl">
                                <input 
                                    value={postContent}
                                    onChange={e => setPostContent(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handlePost()}
                                    placeholder="Apni update share karo, dost..." 
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
                                />
                                <button onClick={handlePost} className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-500 transition-all active:scale-95 shadow-lg"><i className="fa-solid fa-paper-plane"></i></button>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'challenges' && selectedChallenge ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                        <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                            <button onClick={() => setSelectedChallenge(null)} className="md:hidden w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center"><i className="fa-solid fa-arrow-left text-xs"></i></button>
                            <div className="flex-1 ml-4 sm:ml-0">
                                <h2 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">{selectedChallenge.name}</h2>
                                <p className="text-slate-400 text-xs mt-1 font-medium">{selectedChallenge.description}</p>
                            </div>
                            {!selectedChallenge.is_joined ? (
                                <button onClick={() => handleJoinChallenge(selectedChallenge.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg active:scale-95">Join Now</button>
                            ) : (
                                <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2"><i className="fa-solid fa-circle-check"></i> Participating</div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                            <h3 className="text-white font-black text-lg mb-6 flex items-center gap-2 uppercase tracking-tighter"><i className="fa-solid fa-ranking-star text-yellow-500"></i> Leaderboard</h3>
                            {leaderboard.length === 0 ? <div className="text-center py-20 text-slate-600 opacity-50"><i className="fa-solid fa-list-ol text-5xl mb-4"></i><p className="font-bold text-xs uppercase tracking-widest">No participants yet</p></div> : (
                                <div className="space-y-3">{leaderboard.map((p, idx) => {
                                    const isMe = p.user_id === profile.id;
                                    return (
                                        <div key={p.user_id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all animate-message-pop ${isMe ? 'bg-orange-600/10 border-orange-500 shadow-lg scale-[1.02]' : 'bg-slate-800/40 border-slate-700/50'}`}>
                                            <div className={`w-8 h-8 flex items-center justify-center font-black rounded-xl shrink-0 text-sm ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-500'}`}>{idx + 1}</div>
                                            <img src={p.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-10 h-10 rounded-full border-2 border-slate-700 object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1"><h4 className={`font-black text-sm truncate ${isMe ? 'text-white' : 'text-slate-200'}`}>{p.profile?.full_name}</h4><div className={`text-sm font-black ${isMe ? 'text-orange-400' : 'text-white'}`}>{p.current_steps.toLocaleString()}</div></div>
                                                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400" style={{ width: `${Math.min((p.current_steps / selectedChallenge.target_steps) * 100, 100)}%` }}></div></div>
                                            </div>
                                        </div>
                                    );
                                })}</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 p-8 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-slate-800/40 rounded-full flex items-center justify-center mb-6 border border-slate-800/50 shadow-inner">
                            <i className={`fa-solid ${activeTab === 'groups' ? 'fa-people-group' : 'fa-trophy'} text-5xl opacity-30`}></i>
                        </div>
                        <h3 className="text-white font-black text-2xl tracking-tighter uppercase">Community Dash</h3>
                        <p className="text-slate-500 text-sm max-w-xs mt-3 leading-relaxed">
                            {activeTab === 'groups' 
                                ? "Find your tribe! Create or join a local walking group to share your progress and motivate the squad." 
                                : "Rise to the top! Compete in monthly or custom challenges with thousands of walkers across India."}
                        </p>
                        {!profile.isGuest && (
                            <div className="mt-8 p-4 bg-slate-800/40 border border-slate-700 rounded-2xl flex flex-col items-center gap-2">
                                <p className="text-[10px] text-slate-500 uppercase font-black">Your Profile ID</p>
                                <code className="text-brand-400 text-xs font-mono font-bold bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">{profile.id}</code>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(profile.id!); alert("Copied! Share this with friends so they can invite you."); }}
                                    className="text-[10px] text-slate-400 hover:text-white underline mt-1"
                                >
                                    Copy to share
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
