
import React, { useState, useEffect } from 'react';
import { UserProfile, WalkingGroup, Challenge, ChallengeParticipant, GroupPost } from '../types';
import { fetchGroups, createGroup, joinGroup, fetchChallenges, joinChallenge, fetchLeaderboard, createSystemMonthlyChallenge, fetchGroupPosts, createPost } from '../services/socialService';

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
          alert('Failed to create group');
      }
  };

  const handleJoinGroup = async (gid: string) => {
      try {
          await joinGroup(gid, profile.id!);
          alert('Joined successfully! Welcome to the squad.');
          loadData();
          // Update local state to reflect join
          setGroups(prev => prev.map(g => g.id === gid ? { ...g, is_member: true, member_count: (g.member_count || 0) + 1 } : g));
          if (selectedGroup?.id === gid) {
              setSelectedGroup(prev => prev ? { ...prev, is_member: true } : null);
          }
      } catch(e) { alert('Could not join group.'); }
  };

  const openGroup = async (group: WalkingGroup) => {
      setSelectedGroup(group);
      try {
          const posts = await fetchGroupPosts(group.id);
          setGroupFeed(posts);
      } catch (e) {
          setGroupFeed([]);
      }
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
          // Update local state
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
                        onClick={() => { setActiveTab('groups'); setSelectedGroup(null); }} 
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'groups' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Groups
                    </button>
                    <button 
                        onClick={() => { setActiveTab('challenges'); setSelectedChallenge(null); }} 
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'challenges' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Challenges
                    </button>
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
                                <button onClick={handleCreateGroup} disabled={!newGroupName || !newGroupLoc} className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-black transition-all shadow-lg">
                                    Start Group
                                </button>
                            </div>
                        )}

                        {groups.length === 0 && !loading && (
                            <div className="text-center py-10">
                                <i className="fa-solid fa-people-group text-slate-700 text-3xl mb-3"></i>
                                <p className="text-slate-500 text-xs">No groups found. Start one!</p>
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
                        {challenges.length === 0 && !loading && (
                            <div className="text-center py-10">
                                <i className="fa-solid fa-trophy text-slate-700 text-3xl mb-3"></i>
                                <p className="text-slate-500 text-xs">No active challenges. Check back later!</p>
                            </div>
                        )}

                        {challenges.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => openChallenge(c)} 
                                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden ${selectedChallenge?.id === c.id ? 'bg-orange-600 border-orange-400 shadow-xl' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'}`}
                            >
                                {selectedChallenge?.id === c.id && (
                                    <div className="absolute top-0 right-0 p-8 opacity-20 text-4xl transform translate-x-1/4 -translate-y-1/4">
                                        <i className="fa-solid fa-medal"></i>
                                    </div>
                                )}
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
                                <p className="text-slate-400 text-xs mt-2 font-medium"><i className="fa-solid fa-map-pin text-brand-500 mr-1"></i> Based in {selectedGroup.location}</p>
                            </div>
                            {!selectedGroup.is_member && (
                                <button onClick={() => handleJoinGroup(selectedGroup.id)} className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95">
                                    Join Group
                                </button>
                            )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-24">
                            {groupFeed.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                    <i className="fa-solid fa-comments text-5xl mb-4"></i>
                                    <p className="font-bold">Be the first to say something!</p>
                                </div>
                            ) : (
                                groupFeed.map(post => (
                                    <div key={post.id} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex gap-4 animate-message-pop">
                                        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-lg">
                                            {post.profile?.avatar_url ? <img src={post.profile.avatar_url} className="w-full h-full rounded-full object-cover" /> : post.profile?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-black text-white">{post.profile?.full_name}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm leading-relaxed">{post.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area */}
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
                                <i className="fa-solid fa-lock"></i> Join group to participate
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
                                : "Compete with thousands of walkers across the country. Earn your place on the leaderboard."}
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
