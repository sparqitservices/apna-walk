
import React, { useState, useEffect } from 'react';
import { UserProfile, WalkingGroup, Challenge, ChallengeParticipant, GroupPost, GroupMember } from '../types';
import { 
  fetchGroups, createGroup, updateGroup, deleteGroup, 
  requestJoinGroup, fetchPendingRequests, approveMember, rejectMember,
  fetchChallenges, joinChallenge, fetchLeaderboard, 
  createSystemMonthlyChallenge, fetchGroupPosts, createPost,
  createCustomChallenge, inviteToChallenge
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
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeParticipant[]>([]);
  const [groupFeed, setGroupFeed] = useState<GroupPost[]>([]);
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
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      try {
          await createCustomChallenge({
              name: newChallengeName,
              description: newChallengeDesc || "A custom monthly challenge!",
              target_steps: newChallengeTarget,
              type: 'custom',
              start_date: today.toISOString().split('T')[0],
              end_date: nextMonth.toISOString().split('T')[0]
          }, profile.id!, invitedList);
          
          setShowCreateChallenge(false);
          setNewChallengeName('');
          setNewChallengeDesc('');
          setNewChallengeTarget(50000);
          setInvitedList([]);
          loadData();
          alert("Challenge created and friends invited! Chalo shuru karein!");
      } catch (e) {
          alert("Failed to create challenge. Check your connection.");
      }
  };

  const handleAddInvite = () => {
      if (!inviteId.trim()) return;
      if (invitedList.includes(inviteId.trim())) return;
      setInvitedList([...invitedList, inviteId.trim()]);
      setInviteId('');
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
          
          // Instantly update the local groups state for responsiveness
          setGroups(prev => prev.map(g => g.id === gid ? { ...g, is_pending: true } : g));
          
          // If the group is already selected, update it too
          if (selectedGroup?.id === gid) {
              setSelectedGroup(prev => prev ? { ...prev, is_pending: true } : null);
          }
          
          // Re-fetch to confirm from server
          loadData();
      } catch(e: any) { 
          const msg = e?.message || "Check your connection.";
          if (msg.includes("Database schema")) {
              alert("DATABASE UPDATE REQUIRED:\nPlease run the SQL provided by the assistant in your Supabase SQL editor to enable the 'status' column.");
          } else {
              alert(`Could not send join request. ${msg}`); 
          }
          console.error("Join group error:", e);
      }
  };

  const openGroup = async (group: WalkingGroup) => {
      setSelectedGroup(group);
      setEditGroupName(group.name);
      setShowSettings(false);
      setShowRequests(false);
      try {
          const posts = await fetchGroupPosts(group.id);
          setGroupFeed(posts);
          
          if (group.created_by === profile.id) {
              const reqs = await fetchPendingRequests(group.id);
              setPendingRequests(reqs);
          }
      } catch (e) {
          setGroupFeed([]);
      }
  };

  const handleApprove = async (m: GroupMember) => {
      try {
          await approveMember(m.id);
          setPendingRequests(prev => prev.filter(r => r.id !== m.id));
          alert(`${m.profile?.full_name} is now a member!`);
          // Refresh data to update member count
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

  const handlePost = async () => {
      if(!postContent.trim() || !selectedGroup) return;
      try {
          await createPost(selectedGroup.id, profile.id!, postContent);
          setPostContent('');
          const posts = await fetchGroupPosts(selectedGroup.id);
          setGroupFeed(posts);
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
                <button 
                    onClick={onClose} 
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
                >
                    Back to Home
                </button>
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
                    >
                        Groups
                    </button>
                    <button 
                        onClick={() => { setActiveTab('challenges'); setSelectedGroup(null); setSelectedChallenge(null); }} 
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'challenges' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Challenges
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
                {profile.id && (
                    <div className="hidden sm:block text-[10px] text-slate-500 font-mono bg-slate-800/50 px-2 py-1 rounded border border-slate-700">
                        My ID: {profile.id.substring(0, 8)}...
                    </div>
                )}
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
                                <button onClick={handleCreateGroup} disabled={!newGroupName || !newGroupLoc} className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-black transition-all shadow-lg">
                                    Start Group
                                </button>
                            </div>
                        )}

                        {groups.map(g => (
                            <div 
                                key={g.id} 
                                onClick={() => openGroup(g)} 
                                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${selectedGroup?.id === g.id ? 'bg-brand-600 border-brand-400 shadow-xl' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'}`}
                            >
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
                        <button 
                            onClick={() => setShowCreateChallenge(!showCreateChallenge)} 
                            className={`w-full py-4 border-2 border-dashed rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${showCreateChallenge ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-orange-500 hover:text-orange-500'}`}
                        >
                            <i className={`fa-solid ${showCreateChallenge ? 'fa-minus' : 'fa-plus'}`}></i> {showCreateChallenge ? 'Cancel Challenge' : 'Custom Challenge'}
                        </button>

                        {showCreateChallenge && (
                            <div className="bg-slate-800 p-4 rounded-2xl animate-fade-in border border-orange-500/30 shadow-xl space-y-3">
                                <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-2">Challenge Details</h5>
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none" placeholder="Challenge Name" value={newChallengeName} onChange={e => setNewChallengeName(e.target.value)} />
                                <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none h-16 resize-none" placeholder="Description (e.g. Last one is a rotten egg!)" value={newChallengeDesc} onChange={e => setNewChallengeDesc(e.target.value)} />
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Target Steps</label>
                                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none" value={newChallengeTarget} onChange={e => setNewChallengeTarget(parseInt(e.target.value))} />
                                </div>
                                
                                <div className="space-y-2 pt-2 border-t border-slate-700">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase block">Invite Friends</label>
                                    <div className="flex gap-2">
                                        <input className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2 text-[10px] text-white outline-none focus:border-orange-500" placeholder="Paste Profile ID" value={inviteId} onChange={e => setInviteId(e.target.value)} />
                                        <button onClick={handleAddInvite} className="px-3 bg-slate-700 text-white rounded-xl text-xs font-bold">+</button>
                                    </div>
                                    {invitedList.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {invitedList.map(id => (
                                                <span key={id} className="bg-slate-700 text-[8px] px-1.5 py-0.5 rounded text-slate-300 flex items-center gap-1">
                                                    {id.substring(0, 5)}... <i className="fa-solid fa-xmark cursor-pointer" onClick={() => setInvitedList(invitedList.filter(x => x !== id))}></i>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleCreateChallenge} disabled={!newChallengeName} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-black transition-all shadow-lg mt-2">
                                    Create Monthly Challenge
                                </button>
                            </div>
                        )}

                        {challenges.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => openChallenge(c)} 
                                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden ${selectedChallenge?.id === c.id ? 'bg-orange-600 border-orange-400 shadow-xl' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'}`}
                            >
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
                        <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase text-brand-400 tracking-widest bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">Walking Squad</span>
                                </div>
                                <h2 className="text-3xl font-black text-white leading-none">{selectedGroup.name}</h2>
                                <p className="text-slate-400 text-xs mt-2 font-medium"><i className="fa-solid fa-map-pin text-brand-500 mr-1"></i> {selectedGroup.location}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedGroup.created_by === profile.id && (
                                    <>
                                        <button onClick={() => { setShowRequests(!showRequests); setShowSettings(false); }} className="w-11 h-11 rounded-xl bg-slate-700 text-white flex items-center justify-center relative transition-transform active:scale-95">
                                            <i className="fa-solid fa-user-plus"></i>
                                            {pendingRequests.length > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-slate-800">{pendingRequests.length}</div>}
                                        </button>
                                        <button onClick={() => { setShowSettings(!showSettings); setShowRequests(false); }} className="w-11 h-11 rounded-xl bg-slate-700 text-white flex items-center justify-center transition-transform active:scale-95">
                                            <i className="fa-solid fa-gear"></i>
                                        </button>
                                    </>
                                )}
                                {!selectedGroup.is_member && !selectedGroup.is_pending && (
                                    <button onClick={() => handleJoinRequest(selectedGroup.id)} className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95">
                                        Join Group
                                    </button>
                                )}
                                {selectedGroup.is_pending && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2">
                                        <i className="fa-solid fa-clock-rotate-left"></i> Request Pending
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Management Overlays */}
                        {showSettings && (
                            <div className="bg-slate-800 p-6 border-b border-slate-700 animate-fade-in space-y-4">
                                <h4 className="text-white font-bold text-sm uppercase tracking-widest">Group Settings</h4>
                                <div className="flex gap-4">
                                    <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-brand-500" placeholder="New Name" />
                                    <button onClick={handleUpdateGroup} className="bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold active:scale-95">Update Name</button>
                                </div>
                                <button onClick={handleDeleteGroup} className="w-full border border-red-500/50 text-red-500 py-3 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95">Delete Group Permanently</button>
                            </div>
                        )}

                        {showRequests && (
                            <div className="bg-slate-800 p-6 border-b border-slate-700 animate-fade-in">
                                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-4">Pending Requests</h4>
                                {pendingRequests.length === 0 ? (
                                    <div className="text-center py-4 opacity-50">
                                        <i className="fa-solid fa-ghost mb-2 block"></i>
                                        <p className="text-[10px] font-bold uppercase">No pending requests.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingRequests.map(m => (
                                            <div key={m.id} className="bg-slate-900 p-3 rounded-xl flex items-center justify-between animate-message-pop">
                                                <div className="flex items-center gap-3">
                                                    <img src={m.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-10 h-10 rounded-full border border-slate-700" />
                                                    <span className="text-white font-bold text-sm">{m.profile?.full_name}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleApprove(m)} className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold active:scale-95">Approve</button>
                                                    <button onClick={() => handleReject(m)} className="bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg text-xs font-bold active:scale-95">Reject</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-24">
                            {groupFeed.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                    <i className="fa-solid fa-comments text-5xl mb-4"></i>
                                    <p className="font-bold">Chat with the squad here!</p>
                                </div>
                            ) : (
                                groupFeed.map(post => {
                                    const isMe = post.user_id === profile.id;
                                    return (
                                        <div key={post.id} className={`flex gap-3 animate-message-pop ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <div className="w-9 h-9 rounded-full bg-slate-700 shrink-0 overflow-hidden border border-slate-600">
                                                {post.profile?.avatar_url ? <img src={post.profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-black">{post.profile?.full_name?.charAt(0) || 'U'}</div>}
                                            </div>
                                            <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{post.profile?.full_name}</span>}
                                                <div className={`p-4 rounded-2xl shadow-sm text-sm relative ${isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                                    {post.content}
                                                </div>
                                                <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-widest px-1">
                                                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {selectedGroup.is_member ? (
                            <div className="absolute bottom-6 left-6 right-6 flex gap-3 p-3 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl">
                                <input 
                                    value={postContent}
                                    onChange={e => setPostContent(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handlePost()}
                                    placeholder="Apni update share karo, dost..." 
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
                                />
                                <button onClick={handlePost} className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-500 transition-all active:scale-95 shadow-lg">
                                    <i className="fa-solid fa-paper-plane"></i>
                                </button>
                            </div>
                        ) : (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur px-6 py-3 rounded-full border border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <i className="fa-solid fa-lock"></i> {selectedGroup.is_pending ? 'Request Pending' : 'Join group to participate'}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'challenges' && selectedChallenge ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                        <div className="p-6 bg-slate-800 border-b border-slate-700">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <h2 className="text-3xl font-black text-white leading-tight">{selectedChallenge.name}</h2>
                                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">{selectedChallenge.description}</p>
                                    <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar text-orange-400"></i> Ends {new Date(selectedChallenge.end_date).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1.5"><i className="fa-solid fa-users text-orange-400"></i> {selectedChallenge.participant_count} Participants</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!selectedChallenge.is_joined ? (
                                        <button onClick={() => handleJoinChallenge(selectedChallenge.id)} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-orange-900/20 active:scale-95 transition-all">
                                            Join Challenge
                                        </button>
                                    ) : (
                                        <div className="w-full sm:w-auto bg-green-500/10 border border-green-500/30 text-green-400 px-6 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                                            <i className="fa-solid fa-circle-check"></i> Participating
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-white font-black text-xl flex items-center gap-2"><i className="fa-solid fa-ranking-star text-yellow-500"></i> Leaderboard</h3>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Top 50 Performers</span>
                            </div>

                            {leaderboard.length === 0 ? (
                                <div className="text-center py-20 text-slate-600">
                                    <i className="fa-solid fa-list-ol text-5xl mb-4 opacity-30"></i>
                                    <p className="font-bold">No participants yet. Be the first!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {leaderboard.map((p, idx) => {
                                        const isMe = p.user_id === profile.id;
                                        return (
                                            <div key={p.user_id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all animate-message-pop ${isMe ? 'bg-orange-600/10 border-orange-500 shadow-lg scale-[1.02]' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'}`}>
                                                <div className={`w-8 h-8 flex items-center justify-center font-black rounded-xl shrink-0 text-sm ${idx === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : idx === 1 ? 'bg-slate-200 text-black' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="relative">
                                                    <img src={p.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover" />
                                                    {idx < 3 && <i className={`fa-solid fa-crown absolute -top-2 -right-1 text-xs ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-300' : 'text-orange-700'} drop-shadow-md`}></i>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <h4 className={`font-black text-sm truncate ${isMe ? 'text-white' : 'text-slate-200'}`}>{p.profile?.full_name || 'Anonymous Walker'}</h4>
                                                        {isMe && <span className="text-[8px] bg-orange-500 text-white px-1.5 rounded font-black ml-2">YOU</span>}
                                                    </div>
                                                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden relative shadow-inner">
                                                        <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400" style={{ width: `${Math.min((p.current_steps / selectedChallenge.target_steps) * 100, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg font-black leading-none ${isMe ? 'text-orange-400' : 'text-white'}`}>{p.current_steps.toLocaleString()}</div>
                                                    <div className="text-[10px] text-slate-500 font-black uppercase mt-1">Steps</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {selectedChallenge.is_joined && (
                            <div className="absolute bottom-6 left-6 right-6 flex gap-3 p-3 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl">
                                <input 
                                    value={inviteId}
                                    onChange={e => setInviteId(e.target.value)}
                                    placeholder="Enter Friend's Profile ID to Invite..." 
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500"
                                />
                                <button onClick={() => { inviteToChallenge(selectedChallenge.id, inviteId); setInviteId(''); alert("Invite sent!"); }} className="bg-orange-500 text-white px-6 rounded-xl font-bold text-xs uppercase transition-all active:scale-95">Invite</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 p-8 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-slate-800/40 rounded-full flex items-center justify-center mb-6 border border-slate-800/50 shadow-inner">
                            <i className={`fa-solid ${activeTab === 'groups' ? 'fa-people-group' : 'fa-trophy'} text-5xl opacity-30`}></i>
                        </div>
                        <h3 className="text-white font-black text-2xl tracking-tighter">Community Dashboard</h3>
                        <p className="text-slate-500 text-sm max-w-xs mt-3 leading-relaxed">
                            {activeTab === 'groups' 
                                ? "Join a local walking group to share your progress and motivate each other. Desi style!" 
                                : "Compete with thousands of walkers across the country. Create your own challenges and invite friends!"}
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
