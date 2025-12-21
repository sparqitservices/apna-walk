import React, { useState, useEffect, useMemo } from 'react';
import { AdminUserView, WalkSession, DailyHistory } from '../types';
import { fetchAllUsersAdmin, fetchUserSessionsAdmin, fetchUserHistoryAdmin } from '../services/storageService';
import { sendAdminOTP, verifyAdminOTP, signOut } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { RouteMap } from './RouteMap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserView | null>(null);
  const [userSessions, setUserSessions] = useState<WalkSession[]>([]);
  const [userHistory, setUserHistory] = useState<DailyHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'steps' | 'active'>('name');

  // Login UI state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === 'apnawalk@gmail.com') {
        setIsAuthorized(true);
        loadUsers();
    } else {
        setIsAuthorized(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
        await sendAdminOTP(email);
        setOtpSent(true);
    } catch (err: any) {
        setAuthError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
        await verifyAdminOTP(email, otp);
        setIsAuthorized(true);
        loadUsers();
    } catch (err: any) {
        setAuthError("Invalid OTP. Please check and try again.");
    } finally {
        setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const data = await fetchAllUsersAdmin();
    setUsers(data);
    setLoading(false);
  };

  const handleUserSelect = async (user: AdminUserView) => {
      setSelectedUser(user);
      setLoadingDetail(true);
      try {
        const [sessions, history] = await Promise.all([
            fetchUserSessionsAdmin(user.id),
            fetchUserHistoryAdmin(user.id)
        ]);
        setUserSessions(sessions);
        setUserHistory(history);
      } catch (e) {
          console.error("Error loading user details", e);
      } finally {
        setLoadingDetail(false);
      }
  };

  const handleLogout = async () => {
      await signOut();
      setIsAuthorized(false);
      setOtpSent(false);
      setOtp('');
  };

  const filteredUsers = useMemo(() => {
      let result = users.filter(u => 
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (sortBy === 'steps') {
          result.sort((a, b) => (b.today_steps || 0) - (a.today_steps || 0));
      } else if (sortBy === 'active') {
          result.sort((a, b) => new Date(b.last_active || 0).getTime() - new Date(a.last_active || 0).getTime());
      } else {
          result.sort((a, b) => a.full_name.localeCompare(b.full_name));
      }

      return result;
  }, [users, searchQuery, sortBy]);

  // Auth Gate
  if (isAuthorized === null) {
      return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (isAuthorized === false) {
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl animate-message-pop">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-brand-500/10 rounded-3xl flex items-center justify-center text-brand-500 mb-6 border border-brand-500/20">
                        <i className="fa-solid fa-lock text-3xl"></i>
                    </div>
                    <h1 className="text-2xl font-black text-white italic tracking-tighter">ADMIN ACCESS</h1>
                    <p className="text-slate-500 text-xs uppercase tracking-[4px] mt-2 font-bold">Secure Gateway</p>
                </div>

                {authError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-3">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        {authError}
                    </div>
                )}

                {!otpSent ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Authorized Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                placeholder="apnawalk@gmail.com"
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-brand-500 transition-all font-bold placeholder:opacity-30"
                                required
                            />
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Send Verification Code"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Enter OTP</label>
                            <input 
                                type="text" 
                                value={otp} 
                                onChange={e => setOtp(e.target.value)}
                                placeholder="123456"
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-brand-500 transition-all text-center text-2xl tracking-[10px] font-black placeholder:opacity-10"
                                required
                            />
                            <p className="text-[9px] text-slate-500 mt-3 text-center font-bold uppercase tracking-wider">Sent to {email}</p>
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Authorize & Login"}
                        </button>
                        <button type="button" onClick={() => setOtpSent(false)} className="w-full text-[10px] text-slate-500 hover:text-white uppercase font-black tracking-widest mt-4">Change Email</button>
                    </form>
                )}
            </div>
        </div>
    );
  }

  // Aggregate stats
  const totalUsers = users.length;
  const activeToday = users.filter(u => u.today_steps && u.today_steps > 0).length;
  const totalStepsToday = users.reduce((acc, curr) => acc + (curr.today_steps || 0), 0);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden">
       
       {/* Sidebar */}
       <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-8 flex flex-col shrink-0 h-screen overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/20 italic">
                  A
              </div>
              <div>
                  <h1 className="font-black text-xl text-white italic tracking-tighter">Apna<span className="text-brand-500">Admin</span></h1>
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-[4px]">Command Center</p>
              </div>
          </div>
          
          <nav className="space-y-3 mb-10">
              <button className="w-full text-left px-5 py-4 bg-brand-500/10 text-brand-400 rounded-2xl font-black text-[10px] border border-brand-500/20 uppercase tracking-[2px] shadow-lg">
                  <i className="fa-solid fa-users-viewfinder mr-3 text-sm"></i> User Management
              </button>
              <button className="w-full text-left px-5 py-4 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[2px]">
                  <i className="fa-solid fa-chart-line mr-3 text-sm"></i> Growth Metrics
              </button>
              <button className="w-full text-left px-5 py-4 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[2px]">
                  <i className="fa-solid fa-shield-halved mr-3 text-sm"></i> Security Logs
              </button>
          </nav>

          <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800 mb-10">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Quick Stats</p>
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400">Total Reach</span>
                      <span className="text-white font-black italic">{totalUsers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400">Heat Index</span>
                      <span className="text-emerald-500 font-black italic">High</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 w-[65%]"></div>
                  </div>
              </div>
          </div>
          
          <div className="mt-auto space-y-4 pt-8 border-t border-slate-800">
              <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                      <i className="fa-solid fa-user-tie text-xs text-slate-400"></i>
                  </div>
                  <div className="min-w-0">
                      <p className="text-[10px] font-black text-white truncate">apnawalk@gmail.com</p>
                      <p className="text-[8px] text-brand-500 font-black uppercase tracking-widest">Master Admin</p>
                  </div>
              </div>
              <button onClick={handleLogout} className="w-full py-3 bg-red-500/5 hover:bg-red-500/10 text-red-500/60 hover:text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <i className="fa-solid fa-power-off mr-2"></i> Log Out
              </button>
          </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 overflow-hidden flex flex-col h-screen relative">
           
           {/* Top Stats Bar */}
           <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#020617] relative z-10 border-b border-slate-800/50">
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex items-center gap-6 shadow-xl">
                    <div className="w-14 h-14 rounded-3xl bg-blue-600/10 text-blue-500 flex items-center justify-center text-2xl border border-blue-600/20 shadow-inner">
                        <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{totalUsers}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold">Walkers Enrolled</div>
                    </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex items-center gap-6 shadow-xl">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center text-2xl border border-emerald-600/20 shadow-inner">
                        <i className="fa-solid fa-bolt-lightning"></i>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{activeToday}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold">Active Today</div>
                    </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex items-center gap-6 shadow-xl">
                    <div className="w-14 h-14 rounded-3xl bg-orange-600/10 text-orange-500 flex items-center justify-center text-2xl border border-orange-600/20 shadow-inner">
                        <i className="fa-solid fa-shoe-prints"></i>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{totalStepsToday.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold">Total Steps (24h)</div>
                    </div>
                </div>
           </div>

           {/* Dashboard Content Container */}
           <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#020617]">
               
               {/* User Roster */}
               <div className="w-full md:w-[400px] border-r border-slate-800/50 flex flex-col bg-slate-950/30">
                    <div className="p-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-black text-xs uppercase tracking-[4px] text-slate-400">Roster Intelligence</h2>
                            <button onClick={loadUsers} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-all">
                                <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''} text-xs`}></i>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative group">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500 transition-colors"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search walker name, @username..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-xs text-white outline-none focus:border-brand-500/50 transition-all placeholder:text-slate-700 shadow-inner"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setSortBy('name')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${sortBy === 'name' ? 'bg-white text-slate-900 border-white' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>Name</button>
                                <button onClick={() => setSortBy('steps')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${sortBy === 'steps' ? 'bg-white text-slate-900 border-white' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>Steps</button>
                                <button onClick={() => setSortBy('active')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${sortBy === 'active' ? 'bg-white text-slate-900 border-white' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>Activity</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {loading && users.length === 0 ? (
                            <div className="p-12 text-center text-slate-600 flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Database...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-20 text-center text-slate-700">
                                <i className="fa-solid fa-ghost text-4xl mb-4 opacity-20"></i>
                                <p className="text-[10px] font-black uppercase tracking-widest">No matching agents found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-900/50">
                                {filteredUsers.map(user => (
                                    <div 
                                        key={user.id} 
                                        onClick={() => handleUserSelect(user)}
                                        className={`p-6 cursor-pointer transition-all flex items-center gap-4 group ${selectedUser?.id === user.id ? 'bg-brand-500/5 border-r-4 border-brand-500' : 'hover:bg-slate-900/30 border-r-4 border-transparent'}`}
                                    >
                                        <div className="relative shrink-0">
                                            <img 
                                                src={user.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} 
                                                className="w-12 h-12 rounded-2xl bg-slate-800 object-cover border-2 border-slate-800 shadow-lg group-hover:scale-105 transition-transform"
                                            />
                                            {user.today_steps && user.today_steps > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h3 className="font-black text-sm text-white truncate italic tracking-tight">{user.full_name}</h3>
                                                {user.today_steps && user.today_steps > 0 && (
                                                    <span className="text-[10px] text-emerald-400 font-black tabular-nums">
                                                        {user.today_steps.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-tight">@{user.username}</p>
                                            <div className="flex items-center gap-2 mt-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <i className="fa-solid fa-location-dot text-brand-500 text-[10px]"></i>
                                                <span className="text-[9px] font-black text-slate-400 truncate uppercase tracking-tighter">{user.last_location || 'Ghost Scan'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
               </div>

               {/* Profile View (Focus) */}
               <div className="flex-1 overflow-y-auto bg-[#020617] p-8 no-scrollbar">
                    {selectedUser ? (
                        <div className="max-w-5xl mx-auto animate-fade-in space-y-10">
                            
                            {/* Detailed Profile Header */}
                            <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl text-brand-500 rotate-12 pointer-events-none italic font-black uppercase">TELEMETRY</div>
                                
                                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                                    <div className="relative">
                                        <img 
                                            src={selectedUser.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} 
                                            className="w-32 h-32 rounded-[2.5rem] border-4 border-slate-800 object-cover shadow-[0_0_50px_rgba(0,0,0,0.4)]"
                                        />
                                        <div className="absolute -bottom-2 -right-2 bg-slate-800 text-brand-400 w-10 h-10 rounded-2xl flex items-center justify-center border-2 border-slate-900 shadow-xl">
                                            <i className="fa-solid fa-id-badge text-lg"></i>
                                        </div>
                                    </div>
                                    <div className="text-center md:text-left flex-1">
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                                            <h2 className="text-4xl font-black text-white italic tracking-tighter">{selectedUser.full_name}</h2>
                                            <span className="bg-brand-600/10 text-brand-400 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-brand-500/20">Verified Walker</span>
                                        </div>
                                        <p className="text-slate-400 font-bold mb-4 flex items-center justify-center md:justify-start gap-2">
                                            <i className="fa-solid fa-envelope text-slate-600"></i> {selectedUser.email}
                                        </p>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                            <div className="bg-slate-800 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-300 border border-slate-700 uppercase tracking-widest flex items-center gap-2 shadow-inner">
                                                <i className="fa-solid fa-at text-brand-500"></i> {selectedUser.username}
                                            </div>
                                            <div className="bg-slate-800 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-300 border border-slate-700 uppercase tracking-widest flex items-center gap-2 shadow-inner">
                                                <i className="fa-solid fa-clock-rotate-left text-emerald-500"></i> Last Active: {selectedUser.last_active ? new Date(selectedUser.last_active).toLocaleTimeString() : 'N/A'}
                                            </div>
                                            <div className="bg-slate-800 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-500 border border-slate-700 uppercase tracking-widest shadow-inner">
                                                ID: {selectedUser.id.slice(0, 12)}...
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Grids */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Historical Chart Card */}
                                <div className="lg:col-span-2 bg-slate-900/30 rounded-[3rem] border border-slate-800 overflow-hidden flex flex-col p-8">
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-[4px] text-slate-500">Activity Pulse</h3>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Daily Step Velocity (30 Days)</p>
                                        </div>
                                        <i className="fa-solid fa-chart-simple text-brand-500/20 text-3xl"></i>
                                    </div>
                                    <div className="h-64 w-full">
                                        {loadingDetail ? (
                                            <div className="h-full w-full bg-slate-800/10 rounded-2xl animate-pulse"></div>
                                        ) : userHistory.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={userHistory}>
                                                    <XAxis dataKey="date" hide />
                                                    <YAxis hide />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                                                        itemStyle={{ color: '#10b981', fontWeight: '900' }}
                                                    />
                                                    <Bar dataKey="steps" radius={[4, 4, 4, 4]}>
                                                        {userHistory.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.steps > 5000 ? '#10b981' : '#334155'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-700 text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-800 rounded-3xl">No Historical Telemetry</div>
                                        )}
                                    </div>
                                </div>

                                {/* Latest Location Profile */}
                                <div className="bg-slate-900/30 rounded-[3rem] border border-slate-800 overflow-hidden flex flex-col">
                                    <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                        <h3 className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Geo Footprint</h3>
                                        <i className="fa-solid fa-location-dot text-brand-500"></i>
                                    </div>
                                    <div className="flex-1 p-6 flex flex-col justify-center items-center text-center">
                                        {userSessions.length > 0 && userSessions[0].route ? (
                                            <>
                                                <RouteMap route={userSessions[0].route} className="h-40 w-full rounded-2xl mb-4" />
                                                <p className="text-white font-black italic tracking-tight uppercase text-xs">{selectedUser.last_location || 'Unknown Sector'}</p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Sector mapped via latest session</p>
                                            </>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto border-2 border-dashed border-slate-700">
                                                    <i className="fa-solid fa-satellite-slash text-slate-600 text-xl"></i>
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Location Stealth Active</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Session Logs Detailed */}
                            <div className="bg-slate-900/30 rounded-[3.5rem] border border-slate-800 overflow-hidden flex flex-col">
                                <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-[4px] text-slate-500">Raw Session Stream</h3>
                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Granular Activity Records</p>
                                    </div>
                                    <div className="bg-brand-500/10 text-brand-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-500/20 shadow-inner">{userSessions.length} Recs</div>
                                </div>
                                <div className="p-8 overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[3px] border-b border-slate-800">
                                                <th className="pb-6 pl-4">Date & Time</th>
                                                <th className="pb-6">Steps</th>
                                                <th className="pb-6">Distance</th>
                                                <th className="pb-6">Speed (Avg)</th>
                                                <th className="pb-6">Pace</th>
                                                <th className="pb-6">Duration</th>
                                                <th className="pb-6 pr-4 text-right">Burn</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {loadingDetail ? (
                                                [1,2,3].map(i => <tr key={i}><td colSpan={7} className="py-8"><div className="h-8 bg-slate-800/20 rounded-xl animate-pulse"></div></td></tr>)
                                            ) : userSessions.length > 0 ? (
                                                userSessions.map(session => {
                                                    const km = session.distanceMeters / 1000;
                                                    const paceMin = km > 0.1 ? Math.floor((session.durationSeconds / 60) / km) : 0;
                                                    const paceSec = km > 0.1 ? Math.round(((session.durationSeconds / 60) / km - paceMin) * 60) : 0;
                                                    return (
                                                        <tr key={session.id} className="group hover:bg-slate-800/20 transition-all">
                                                            <td className="py-6 pl-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-brand-500 transition-colors">
                                                                        <i className="fa-solid fa-person-walking"></i>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-white font-black italic tracking-tighter text-sm">{new Date(session.startTime).toLocaleDateString()}</p>
                                                                        <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-slate-200 font-black italic tabular-nums">{session.steps.toLocaleString()}</span>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-slate-400 font-black text-xs tabular-nums">{(session.distanceMeters / 1000).toFixed(2)} KM</span>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-blue-500 font-black italic text-xs tabular-nums">{(session.avgSpeed || 0).toFixed(1)} <small className="text-[8px] opacity-40 uppercase">km/h</small></span>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-slate-400 font-black text-xs tabular-nums">{paceMin}'{paceSec.toString().padStart(2, '0')}"</span>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-slate-500 font-bold text-[10px] tabular-nums">{Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s</span>
                                                            </td>
                                                            <td className="py-6 pr-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <span className="text-orange-500 font-black italic tabular-nums">{session.calories}</span>
                                                                    <i className="fa-solid fa-fire text-[10px] text-orange-600/30"></i>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr><td colSpan={7} className="py-20 text-center opacity-10 font-black uppercase tracking-[10px]">No Logs</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-800 p-12 text-center">
                            <div className="w-32 h-32 bg-slate-900/50 rounded-[3rem] flex items-center justify-center mb-10 border border-slate-800/50 relative">
                                <i className="fa-solid fa-user-astronaut text-6xl opacity-10"></i>
                                <div className="absolute inset-0 bg-brand-500/5 blur-3xl rounded-full"></div>
                            </div>
                            <h3 className="text-3xl font-black uppercase tracking-[15px] text-slate-800 mb-6">Sector Ready</h3>
                            <p className="max-w-md mx-auto text-[10px] font-black uppercase tracking-[6px] text-slate-700 leading-loose">Initialize an agent from the roster to deploy full-spectrum telemetry analysis and behavioral mapping.</p>
                        </div>
                    )}
               </div>
           </div>
       </div>
    </div>
  );
};