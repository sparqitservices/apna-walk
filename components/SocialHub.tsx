

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
          // FIX: Changed full_name to username to resolve TS error
          alert(`${m.profile?.username} is now a member!`);
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
    // FIX: Changed full_name to username to resolve TS error
    if (!confirm(`Are you sure you want to remove ${m.profile?.username} from the group?`)) return;
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
                                    {g.is_member && <i className="fa-solid fa-circle-check text-brand-4