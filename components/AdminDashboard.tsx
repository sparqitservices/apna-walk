import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [systemOnline, setSystemOnline] = useState(true);
  
  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'steps' | 'active'>('name');

  // Login UI state
  const [email, setEmail] = useState('apnawalk@gmail.com');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [rawError, setRawError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const refreshIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    checkAuth();
    return () => {
        if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
        const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
        return () => clearTimeout(t);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (autoRefresh && isAuthorized) {
        refreshIntervalRef.current = window.setInterval(loadUsers, 30000);
    } else {
        if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    }
  }, [autoRefresh, isAuthorized]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === 'apnawalk@gmail.com') {
        setIsAuthorized(true);
        loadUsers();
    } else {
        setIsAuthorized(false);
    }
  };

  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setRawError(null);
    setLoading(true);
    try {
        await sendAdminOTP(email);
        setOtpSent(true);
        setResendTimer(60);
    } catch (err: any) {
        console.error("Full Auth Error Object:", err);
        setRawError(JSON.stringify(err, null, 2));
        
        if (err.message?.includes("rate limit")) {
            setAuthError("Rate limit: Supabase only allows 3 emails per hour on the free tier.");
        } else {
            setAuthError(err.message || "Failed to send OTP. Check Supabase Dashboard -> Auth -> Providers -> Email OTP.");
        }
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setRawError(null);
    setLoading(true);
    try {
        await verifyAdminOTP(email, otp);
        setIsAuthorized(true);
        loadUsers();
    } catch (err: any) {
        setRawError(JSON.stringify(err, null, 2));
        setAuthError("Invalid code. Check your email or try again.");
    } finally {
        setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
        const data = await fetchAllUsersAdmin();
        setUsers(data);
        setSystemOnline(true);
    } catch (e) {
        setSystemOnline(false);
    } finally {
        setLoading(false);
    }
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
      setRawError(null);
  };

  const exportCSV = () => {
    const headers = ["ID", "Username", "Email", "Full Name", "Steps Today", "Last Location"];
    const rows = filteredUsers.map(u => [u.id, u.username, u.email, u.full_name, u.today_steps, u.last_location]);
    const content = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apnawalk_roster_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  // Aggregate stats
  const totalUsers = users.length;
  const activeToday = users.filter(u => u.today_steps && u.today_steps > 0).length;
  const totalStepsToday = users.reduce((acc, curr) => acc + (curr.today_steps || 0), 0);

  // Auth Gate
  if (isAuthorized === null) {
      return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (isAuthorized === false) {
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl animate-message-pop">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-brand-500/10 rounded-3xl flex items-center justify-center text-brand-500 mb-6 border border-brand-500/20">
                        <i className="fa-solid fa-shield-halved text-3xl"></i>
                    </div>
                    <h1 className="text-2xl font-black text-white italic tracking-tighter">APNAWALK ADMIN</h1>
                    <p className="text-slate-500 text-xs uppercase tracking-[4px] mt-2 font-bold">Encrypted Access</p>
                </div>

                {authError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                            <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                            <span>{authError}</span>
                        </div>
                        {rawError && (
                            <details className="mt-2 opacity-50">
                                <summary className="cursor-pointer text-[9px] uppercase tracking-widest font-black">Raw Error Log</summary>
                                <pre className="mt-2 p-2 bg-black/40 rounded-lg text-[8px] font-mono whitespace-pre-wrap overflow-x-auto">{rawError}</pre>
                            </details>
                        )}
                    </div>
                )}

                {!otpSent ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Admin Credential</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                placeholder="apnawalk@gmail.com"
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-brand-500 transition-all font-bold"
                                required
                            />
                        </div>
                        <button 
                            disabled={loading || email !== 'apnawalk@gmail.com'}
                            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Generate OTP"}
                        </button>
                        <p className="text-[9px] text-slate-500 text-center mt-4 uppercase tracking-widest leading-relaxed">Ensure 'Email OTP' is enabled in your Supabase Auth Settings.</p>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Check Email for Code</label>
                            <input 
                                type="text" 
                                value={otp} 
                                onChange={e => setOtp(e.target.value)}
                                placeholder="000000"
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-brand-500 transition-all text-center text-3xl tracking-[12px] font-black placeholder:opacity-10"
                                required
                                autoFocus
                            />
                            <div className="mt-4 flex flex-col items-center gap-2">
                                <p className="text-[10px] text-slate-400 text-center font-bold">Code sent to <u>{email}</u></p>
                                <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-xl mt-2">
                                    <p className="text-[9px] text-orange-400 text-center font-black uppercase tracking-wider">Warning: Check Spam Folder</p>
                                    <p className="text-[8px] text-slate-500 text-center mt-1">Supabase automated emails are often blocked by Gmail filters.</p>
                                </div>
                            </div>
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Verify & Unlock"}
                        </button>
                        
                        <div className="flex justify-between items-center px-1">
                            <button type="button" onClick={() => setOtpSent(false)} className="text-[10px] text-slate-500 hover:text-white uppercase font-black tracking-widest">Back</button>
                            <button 
                                type="button" 
                                onClick={handleSendOTP} 
                                disabled={resendTimer > 0 || loading}
                                className="text-[10px] text-brand-500 hover:text-brand-400 disabled:text-slate-700 uppercase font-black tracking-widest"
                            >
                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
  }

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

          <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800 mb-10 space-y-6">
              <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">System Status</p>
                  <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-slate-400">Database</span>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${systemOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                        <span className={`text-[9px] font-black uppercase ${systemOnline ? 'text-emerald-500' : 'text-red-500'}`}>{systemOnline ? 'Healthy' : 'Error'}</span>
                      </div>
                  </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                      <i className="fa-solid fa-rotate text-brand-500 text-xs"></i>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Auto Sync</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="sr-only peer" />
                        <div className="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
              </div>

              <button onClick={exportCSV} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-download"></i> Export Roster
              </button>
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
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex items-center gap-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-14 h-14 rounded-3xl bg-blue-600/10 text-blue-500 flex items-center justify-center text-2xl border border-blue-600/20 shadow-inner">
                        <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{totalUsers}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold">Total Community</div>
                    </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex items-center gap-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-14 h-14 rounded-3xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center text-2xl border border-emerald-600/20 shadow-inner">
                        <i className="fa-solid fa-bolt-lightning"></i>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{activeToday}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold">Active Right Now</div>
                    </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex items-center gap-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-14 h-14 rounded-3xl bg-orange-600/10 text-orange-500 flex items-center justify-center text-2xl border border-orange-600/20 shadow-inner">
                        <i className="fa-solid fa-shoe-prints"></i>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{totalStepsToday.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold">Global Steps (24h)</div>
                    </div>
                </div>
           </div>

           {/* Dashboard Content Container */}
           <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#020617]">
               
               {/* User Roster */}
               <div className="w-full md:w-[400px] border-r border-slate-800/50 flex flex-col bg-slate-950/30 shrink-0">
                    <div className="p-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-black text-xs uppercase tracking-[4px] text-slate-400">Roster Intelligence</h2>
                            <div className="flex gap-2">
                                <button onClick={loadUsers} className={`w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-all ${loading ? 'opacity-50' : ''}`}>
                                    <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''} text-xs`}></i>
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative group">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500 transition-colors"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search walker, @username..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-xs text-white outline-none focus:border-brand-500/50 transition-all placeholder:text-slate-700 shadow-inner"
                                />
                            </div>
                            <div className="flex gap-1.5">
                                <button onClick={() => setSortBy('name')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${sortBy === 'name' ? 'bg-white text-slate-900 border-white shadow-lg' : 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-700'}`}>Alpha</button>
                                <button onClick={() => setSortBy('steps')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${sortBy === 'steps' ? 'bg-white text-slate-900 border-white shadow-lg' : 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-700'}`}>Steps</button>
                                <button onClick={() => setSortBy('active')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${sortBy === 'active' ? 'bg-white text-slate-900 border-white shadow-lg' : 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-700'}`}>Recent</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {loading && users.length === 0 ? (
                            <div className="p-12 text-center text-slate-600 flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-[9px] font-black uppercase tracking-[5px] animate-pulse">Scanning Bio-Metrix...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-20 text-center text-slate-700">
                                <i className="fa-solid fa-ghost text-4xl mb-4 opacity-20"></i>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-loose">No active subjects found<br/>matching criteria</p>
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
                                            <div className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-slate-800 shadow-lg group-hover:scale-105 transition-transform overflow-hidden">
                                                <img 
                                                    src={user.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            {user.today_steps && user.today_steps > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-slate-950 shadow-lg"></div>}
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
                                                <span className="text-[9px] font-black text-slate-400 truncate uppercase tracking-tighter">{user.last_location || 'Hidden Sector'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
               </div>

               {/* Profile View (Focus) */}
               <div className="flex-1 overflow-y-auto bg-[#020617] p-4 sm:p-8 no-scrollbar relative">
                    {selectedUser ? (
                        <div className="max-w-5xl mx-auto animate-fade-in space-y-10">
                            
                            {/* Detailed Profile Header */}
                            <div className="bg-slate-900/50 border border-slate-800 p-8 sm:p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-9xl text-brand-500 rotate-12 pointer-events-none italic font-black uppercase">TELEMETRY</div>
                                
                                <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-[2.5rem] border-4 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.4)] overflow-hidden">
                                            <img 
                                                src={selectedUser.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-slate-800 text-brand-400 w-11 h-11 rounded-2xl flex items-center justify-center border-4 border-slate-900 shadow-xl">
                                            <i className="fa-solid fa-id-badge text-xl"></i>
                                        </div>
                                    </div>
                                    <div className="text-center lg:text-left flex-1">
                                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-3">
                                            <h2 className="text-4xl font-black text-white italic tracking-tighter">{selectedUser.full_name}</h2>
                                            <span className="bg-brand-600/10 text-brand-400 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[3px] border border-brand-500/20 shadow-inner">Profile Inspected</span>
                                        </div>
                                        <p className="text-slate-400 font-bold mb-6 flex items-center justify-center lg:justify-start gap-2">
                                            <i className="fa-solid fa-envelope text-slate-600 text-xs"></i> {selectedUser.email}
                                        </p>
                                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                                            <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl text-[10px] font-black text-slate-300 border border-slate-700 uppercase tracking-widest flex items-center gap-2.5 shadow-inner">
                                                <i className="fa-solid fa-at text-brand-500"></i> {selectedUser.username}
                                            </div>
                                            <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl text-[10px] font-black text-slate-300 border border-slate-700 uppercase tracking-widest flex items-center gap-2.5 shadow-inner">
                                                <i className="fa-solid fa-clock-rotate-left text-emerald-500"></i> Last Pulse: {selectedUser.last_active ? new Date(selectedUser.last_active).toLocaleTimeString() : 'Unknown'}
                                            </div>
                                            <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl text-[10px] font-black text-slate-500 border border-slate-700 uppercase tracking-widest shadow-inner">
                                                ID: {selectedUser.id.slice(0, 15)}...
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Grids */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Historical Chart Card */}
                                <div className="lg:col-span-2 bg-slate-900/30 rounded-[3rem] border border-slate-800 overflow-hidden flex flex-col p-8 sm:p-10">
                                    <div className="flex justify-between items-center mb-10">
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-[4px] text-slate-500">Activity Velocity</h3>
                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2 flex items-center gap-2">
                                                <i className="fa-solid fa-bolt-lightning text-brand-500 animate-pulse"></i> 30-Day Step Telemetry
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-3xl font-black text-white italic tabular-nums leading-none">{(userHistory.reduce((a,c)=>a+c.steps,0)/30).toFixed(0)}</span>
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Avg/Day</span>
                                        </div>
                                    </div>
                                    <div className="h-72 w-full">
                                        {loadingDetail ? (
                                            <div className="h-full w-full bg-slate-800/10 rounded-3xl animate-pulse"></div>
                                        ) : userHistory.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={userHistory}>
                                                    <XAxis dataKey="date" hide />
                                                    <YAxis hide />
                                                    <Tooltip 
                                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '10px', fontWeight: '900', color: '#fff' }}
                                                        itemStyle={{ color: '#10b981' }}
                                                        labelStyle={{ display: 'none' }}
                                                        formatter={(value: any) => [`${value.toLocaleString()} steps`, 'Velocity']}
                                                    />
                                                    <Bar dataKey="steps" radius={[6, 6, 6, 6]}>
                                                        {userHistory.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.steps > 5000 ? '#10b981' : '#334155'} fillOpacity={0.8} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-800 text-[10px] font-black uppercase tracking-[8px] border-2 border-dashed border-slate-800/50 rounded-[2.5rem]">
                                                <i className="fa-solid fa-ghost text-4xl mb-4 opacity-10"></i>
                                                Zero Data Retention
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Latest Location Profile */}
                                <div className="bg-slate-900/30 rounded-[3rem] border border-slate-800 overflow-hidden flex flex-col group">
                                    <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                        <h3 className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Geo Signature</h3>
                                        <i className="fa-solid fa-location-dot text-brand-500 group-hover:scale-125 transition-transform"></i>
                                    </div>
                                    <div className="flex-1 p-6 flex flex-col justify-center items-center text-center">
                                        {userSessions.length > 0 && userSessions[0].route ? (
                                            <>
                                                <div className="w-full h-44 rounded-3xl overflow-hidden mb-6 border border-slate-800 shadow-2xl relative">
                                                    <RouteMap route={userSessions[0].route} className="h-full w-full" />
                                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[8px] font-bold text-white uppercase border border-white/10 tracking-widest z-10">Live Path</div>
                                                </div>
                                                <p className="text-white font-black italic tracking-tight uppercase text-sm leading-none">{selectedUser.last_location || 'Unknown Sector'}</p>
                                                <p className="text-[9px] text-slate-600 font-black uppercase mt-3 tracking-[3px]">Sector Encoded via latest session</p>
                                            </>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="w-20 h-20 rounded-[2rem] bg-slate-800/50 flex items-center justify-center mx-auto border-2 border-dashed border-slate-700">
                                                    <i className="fa-solid fa-satellite-slash text-slate-700 text-2xl"></i>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Location Shielded</p>
                                                    <p className="text-[8px] uppercase text-slate-700 mt-2 font-bold leading-relaxed">No GPS data provided<br/>by subject</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Session Logs Detailed */}
                            <div className="bg-slate-900/30 rounded-[3.5rem] border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
                                <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-[4px] text-slate-500">Forensic Activity Log</h3>
                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Granular session telemetry stream</p>
                                    </div>
                                    <div className="bg-brand-500/10 text-brand-500 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-500/20 shadow-inner">{userSessions.length} RECORDS</div>
                                </div>
                                <div className="p-4 sm:p-8 overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left min-w-[700px]">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[4px] border-b border-slate-800/50">
                                                <th className="pb-8 pl-4">Timestamp</th>
                                                <th className="pb-8">Step Count</th>
                                                <th className="pb-8">Metric (KM)</th>
                                                <th className="pb-8">Velocity</th>
                                                <th className="pb-8">Active Pace</th>
                                                <th className="pb-8 pr-4 text-right">Burn</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/30">
                                            {loadingDetail ? (
                                                [1,2,3].map(i => <tr key={i}><td colSpan={6} className="py-8"><div className="h-10 bg-slate-800/20 rounded-2xl animate-pulse"></div></td></tr>)
                                            ) : userSessions.length > 0 ? (
                                                userSessions.map(session => {
                                                    const km = session.distanceMeters / 1000;
                                                    const paceMin = km > 0.1 ? Math.floor((session.durationSeconds / 60) / km) : 0;
                                                    const paceSec = km > 0.1 ? Math.round(((session.durationSeconds / 60) / km - paceMin) * 60) : 0;
                                                    return (
                                                        <tr key={session.id} className="group hover:bg-slate-800/20 transition-all">
                                                            <td className="py-6 pl-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-brand-500 group-hover:bg-brand-500/10 transition-all border border-slate-700/50 shadow-inner">
                                                                        <i className="fa-solid fa-person-walking"></i>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-white font-black italic tracking-tighter text-sm uppercase">{new Date(session.startTime).toLocaleDateString()}</p>
                                                                        <p className="text-[10px] text-slate-600 font-bold uppercase">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-slate-200 font-black italic tabular-nums text-base">{session.steps.toLocaleString()}</span>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-slate-400 font-black text-xs tabular-nums tracking-widest">{km.toFixed(2)} KM</span>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-blue-500 font-black italic text-xs tabular-nums">{(session.avgSpeed || 0).toFixed(1)} <small className="text-[8px] opacity-40">KM/H</small></span>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="text-slate-500 font-bold text-[11px] tabular-nums tracking-widest">{paceMin}'{paceSec.toString().padStart(2, '0')}" /KM</span>
                                                            </td>
                                                            <td className="py-6 pr-4 text-right">
                                                                <div className="flex items-center justify-end gap-2.5">
                                                                    <span className="text-orange-500 font-black italic tabular-nums text-base">{session.calories}</span>
                                                                    <i className="fa-solid fa-fire text-xs text-orange-600/30"></i>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr><td colSpan={6} className="py-24 text-center opacity-[0.03] font-black uppercase tracking-[20px] text-white pointer-events-none">NO_SESSION_DATA</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-800 p-12 text-center">
                            <div className="relative mb-12">
                                <div className="w-36 h-36 bg-slate-900/50 rounded-[3.5rem] flex items-center justify-center border border-slate-800/50 shadow-inner">
                                    <i className="fa-solid fa-satellite text-7xl opacity-5"></i>
                                </div>
                                <div className="absolute inset-0 bg-brand-500/5 blur-[80px] rounded-full"></div>
                                <div className="absolute -top-4 -left-4 w-8 h-8 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center animate-bounce">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                </div>
                            </div>
                            <h3 className="text-4xl font-black uppercase tracking-[20px] text-slate-800 mb-8 italic">READY_SCAN</h3>
                            <p className="max-w-md mx-auto text-[11px] font-black uppercase tracking-[8px] text-slate-700 leading-loose">Select a bio-metric signature from the roster to begin full-spectrum analysis, session forensic tracing, and behavioral mapping.</p>
                        </div>
                    )}
               </div>
           </div>
       </div>
    </div>
  );
};