
import React, { useState, useEffect } from 'react';
import { UserProfile, WalkingGroup, Challenge, ChallengeParticipant, GroupMember, GroupPost } from '../types';
import { fetchGroups, createGroup, joinGroup, fetchChallenges, joinChallenge, fetchLeaderboard, createSystemMonthlyChallenge, fetchGroupPosts, createPost, fetchGroupMembers } from '../services/socialService';

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
  const [postContent, setPostContent] = useState('');

  // Creation Forms
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLoc, setNewGroupLoc] = useState('');

  useEffect(() => {
    if (isOpen && !profile.isGuest) {
      loadData();
      createSystemMonthlyChallenge(); // Ensure monthly exists
    }
  }, [isOpen, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'groups') {
        const g = await fetchGroups();
        setGroups(g);
      } else {
        const c = await fetchChallenges();
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
              description: 'A community of walkers.',
              privacy: 'public'
          });
          setShowCreateGroup(false);
          setNewGroupName('');
          loadData();
      } catch (e) {
          alert('Failed to create group');
      }
  };

  const handleJoinGroup = async (gid: string) => {
      try {
          await joinGroup(gid, profile.id!);
          alert('Joined successfully!');
          loadData();
      } catch(e) { alert('Already a member or error joining.'); }
  };

  const openGroup = async (group: WalkingGroup) => {
      setSelectedGroup(group);
      const posts = await fetchGroupPosts(group.id);
      setGroupFeed(posts);
  };

  const handlePost = async () => {
      if(!postContent.trim() || !selectedGroup) return;
      await createPost(selectedGroup.id, profile.id!, postContent);
      setPostContent('');
      const posts = await fetchGroupPosts(selectedGroup.id);
      setGroupFeed(posts);
  };

  const openChallenge = async (challenge: Challenge) => {
      setSelectedChallenge(challenge);
      const lb = await fetchLeaderboard(challenge.id);
      setLeaderboard(lb);
  };

  const handleJoinChallenge = async (cid: string) => {
      try {
          await joinChallenge(cid, profile.id!);
          alert("You've joined the challenge! Your steps will sync automatically.");
          loadData();
          if(selectedChallenge) openChallenge(selectedChallenge);
      } catch (e) { alert('Could not join.'); }
  };

  if (!isOpen) return null;

  if (profile.isGuest) {
      return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="bg-dark-card w-full max-w-sm rounded-3xl p-8 text-center border border-slate-700">
                <i className="fa-solid fa-users-slash text-4xl text-slate-500 mb-4"></i>
                <h3 className="text-white font-bold text-xl mb-2">Community Features</h3>
                <p className="text-slate-400 text-sm mb-6">Please sign in to join groups and compete in challenges.</p>
                <button onClick={onClose} className="text-brand-400 font-bold text-sm">Close</button>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-4xl h-[90vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-white font-bold text-xl"><span className="text-brand-500">Apna</span>Community</h2>
                <div className="flex bg-slate-800 rounded-full p-1 border border-slate-700">
                    <button onClick={() => { setActiveTab('groups'); setSelectedGroup(null); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${activeTab === 'groups' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}>Groups</button>
                    <button onClick={() => { setActiveTab('challenges'); setSelectedChallenge(null); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${activeTab === 'challenges' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>Challenges</button>
                </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
            
            {/* List Sidebar */}
            <div className={`w-full md:w-1/3 border-r border-slate-700 flex flex-col bg-slate-900/30 ${selectedGroup || selectedChallenge ? 'hidden md:flex' : 'flex'}`}>
                
                {activeTab === 'groups' ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <button onClick={() => setShowCreateGroup(!showCreateGroup)} className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 text-sm font-bold hover:border-brand-500 hover:text-brand-500 transition-colors">
                            <i className="fa-solid fa-plus mr-2"></i> Create Group
                        </button>
                        
                        {showCreateGroup && (
                            <div className="bg-slate-800 p-4 rounded-xl animate-fade-in border border-slate-700">
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white mb-2" placeholder="Group Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white mb-2" placeholder="City/Location" value={newGroupLoc} onChange={e => setNewGroupLoc(e.target.value)} />
                                <button onClick={handleCreateGroup} className="w-full bg-brand-600 text-white py-2 rounded-lg text-xs font-bold">Create</button>
                            </div>
                        )}

                        {loading ? <div className="text-center p-4 text-slate-500"><i className="fa-solid fa-circle-notch fa-spin"></i></div> : 
                         groups.map(g => (
                            <div key={g.id} onClick={() => openGroup(g)} className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedGroup?.id === g.id ? 'bg-brand-900/20 border-brand-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                                <h4 className="font-bold text-white text-sm">{g.name}</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-slate-400"><i className="fa-solid fa-location-dot mr-1"></i> {g.location}</span>
                                    <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">{g.member_count} Members</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? <div className="text-center p-4 text-slate-500"><i className="fa-solid fa-circle-notch fa-spin"></i></div> : 
                         challenges.map(c => (
                            <div key={c.id} onClick={() => openChallenge(c)} className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedChallenge?.id === c.id ? 'bg-orange-900/20 border-orange-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-widest">{c.type}</span>
                                <h4 className="font-bold text-white text-sm mt-1">{c.name}</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-slate-400"><i className="fa-solid fa-shoe-prints mr-1"></i> {(c.target_steps / 1000)}k Target</span>
                                    <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">{c.participant_count} Walkers</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail View */}
            <div className={`w-full md:w-2/3 flex flex-col bg-slate-900/50 ${!selectedGroup && !selectedChallenge ? 'hidden md:flex' : 'flex'}`}>
                
                {/* Back Button Mobile */}
                <button onClick={() => { setSelectedGroup(null); setSelectedChallenge(null); }} className="md:hidden p-3 text-slate-400 hover:text-white flex items-center text-sm border-b border-slate-700">
                    <i className="fa-solid fa-arrow-left mr-2"></i> Back to List
                </button>

                {activeTab === 'groups' && selectedGroup ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 bg-slate-800 border-b border-slate-700">
                            <h2 className="text-2xl font-bold text-white">{selectedGroup.name}</h2>
                            <p className="text-slate-400 text-sm mt-1">{selectedGroup.description}</p>
                            <div className="mt-4 flex gap-3">
                                <button onClick={() => handleJoinGroup(selectedGroup.id)} className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-full font-bold text-sm transition-colors shadow-lg">
                                    Join Group
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Feed */}
                            {groupFeed.map(post => (
                                <div key={post.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold text-white text-xs">
                                            {post.profile?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-white">{post.profile?.full_name}</span>
                                            <span className="text-[10px] text-slate-500 block">{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-sm">{post.content}</p>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                            <input 
                                value={postContent}
                                onChange={e => setPostContent(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handlePost()}
                                placeholder="Share an update..." 
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                            />
                            <button onClick={handlePost} className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600">
                                <i className="fa-solid fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                ) : activeTab === 'challenges' && selectedChallenge ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 bg-slate-800 border-b border-slate-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedChallenge.name}</h2>
                                    <p className="text-slate-400 text-sm mt-1">{selectedChallenge.description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                        <span><i className="fa-regular fa-calendar mr-1"></i> Ends {new Date(selectedChallenge.end_date).toLocaleDateString()}</span>
                                        <span><i className="fa-solid fa-trophy mr-1 text-yellow-500"></i> Target: {selectedChallenge.target_steps.toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleJoinChallenge(selectedChallenge.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
                                    Join Challenge
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><i className="fa-solid fa-ranking-star text-yellow-500"></i> Leaderboard</h3>
                            <div className="space-y-2">
                                {leaderboard.map((p, idx) => (
                                    <div key={p.user_id} className={`flex items-center gap-4 p-3 rounded-xl border ${p.user_id === profile.id ? 'bg-orange-500/10 border-orange-500/50' : 'bg-slate-800 border-slate-700'}`}>
                                        <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-lg ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <img src={p.profile?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} className="w-8 h-8 rounded-full bg-slate-600" />
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">{p.profile?.full_name || 'Anonymous Walker'}</div>
                                            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                                <div className="h-full bg-orange-500" style={{ width: `${Math.min((p.current_steps / selectedChallenge.target_steps) * 100, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-white">{p.current_steps.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-500">STEPS</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <i className={`fa-solid ${activeTab === 'groups' ? 'fa-people-group' : 'fa-medal'} text-4xl opacity-50`}></i>
                        </div>
                        <h3 className="text-white font-bold text-lg">Select a {activeTab === 'groups' ? 'Group' : 'Challenge'}</h3>
                        <p className="text-sm max-w-xs mt-2">Browse the list on the left to view details, join discussions, or check leaderboards.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
