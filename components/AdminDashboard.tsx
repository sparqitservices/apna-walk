import React, { useState, useEffect } from 'react';
import { AdminUserView, WalkSession } from '../types';
import { fetchAllUsersAdmin, fetchUserSessionsAdmin } from '../services/storageService';
import { RouteMap } from './RouteMap';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserView | null>(null);
  const [userSessions, setUserSessions] = useState<WalkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await fetchAllUsersAdmin();
    setUsers(data);
    setLoading(false);
  };

  const handleUserSelect = async (user: AdminUserView) => {
      setSelectedUser(user);
      setLoadingSessions(true);
      const sessions = await fetchUserSessionsAdmin(user.id);
      setUserSessions(sessions);
      setLoadingSessions(false);
  };

  // Calculating aggregate stats
  const totalUsers = users.length;
  const activeToday = users.filter(u => u.today_steps && u.today_steps > 0).length;
  const totalStepsToday = users.reduce((acc, curr) => acc + (curr.today_steps || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col md:flex-row">
       
       {/* Sidebar */}
       <div className="w-full md:w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col shrink-0">
          <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold">
                  A
              </div>
              <h1 className="font-bold text-xl text-white">Apna<span className="text-brand-500">Admin</span></h1>
          </div>
          
          <nav className="space-y-2">
              <button className="w-full text-left px-4 py-2 bg-brand-500/10 text-brand-400 rounded-lg font-medium border border-brand-500/20">
                  <i className="fa-solid fa-users-viewfinder mr-2"></i> User Tracker
              </button>
              <button className="w-full text-left px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                  <i className="fa-solid fa-chart-line mr-2"></i> Analytics
              </button>
              <button className="w-full text-left px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                  <i className="fa-solid fa-gear mr-2"></i> Settings
              </button>
          </nav>
          
          <div className="mt-auto">
              <a href="/" className="block text-center text-sm text-slate-500 hover:text-white">
                  <i className="fa-solid fa-arrow-left mr-1"></i> Back to App
              </a>
          </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 overflow-hidden flex flex-col h-screen">
           
           {/* Top Stats Bar */}
           <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-700 bg-slate-900/95">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
                        <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{totalUsers}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide">Total Users</div>
                    </div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xl">
                        <i className="fa-solid fa-person-walking"></i>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{activeToday}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide">Active Today</div>
                    </div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xl">
                        <i className="fa-solid fa-shoe-prints"></i>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{totalStepsToday.toLocaleString()}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide">Steps Today (Global)</div>
                    </div>
                </div>
           </div>

           {/* Dashboard Grid */}
           <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
               
               {/* User List */}
               <div className="w-full md:w-1/3 border-r border-slate-700 overflow-y-auto bg-slate-900">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                        <h2 className="font-bold text-lg">Users</h2>
                        <button onClick={loadUsers} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300">
                            <i className="fa-solid fa-rotate mr-1"></i> Refresh
                        </button>
                    </div>
                    
                    {loading ? (
                        <div className="p-8 text-center text-slate-500"><i className="fa-solid fa-circle-notch fa-spin text-2xl"></i></div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {users.map(user => (
                                <div 
                                    key={user.id} 
                                    onClick={() => handleUserSelect(user)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-800/50 flex items-center gap-3 ${selectedUser?.id === user.id ? 'bg-slate-800 border-l-4 border-brand-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <img 
                                        src={user.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} 
                                        alt={user.full_name}
                                        className="w-10 h-10 rounded-full bg-slate-700 object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-sm text-white truncate">{user.full_name}</h3>
                                            {user.today_steps && user.today_steps > 0 && (
                                                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">
                                                    {user.today_steps.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                            <i className="fa-solid fa-location-dot text-brand-500/70"></i>
                                            <span className="truncate max-w-[150px]">{user.last_location || 'Unknown Location'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
               </div>

               {/* Detail View */}
               <div className="flex-1 overflow-y-auto bg-slate-900/50 p-6">
                    {selectedUser ? (
                        <div className="space-y-6">
                            {/* User Header */}
                            <div className="flex items-start gap-4 mb-6">
                                <img 
                                    src={selectedUser.avatar_url || 'https://www.gravatar.com/avatar?d=mp'} 
                                    alt={selectedUser.full_name}
                                    className="w-20 h-20 rounded-full border-4 border-slate-700 object-cover shadow-xl"
                                />
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedUser.full_name}</h2>
                                    <p className="text-slate-400">{selectedUser.email}</p>
                                    <p className="text-xs text-slate-500 mt-1">Last Active: {selectedUser.last_active ? new Date(selectedUser.last_active).toLocaleString() : 'Never'}</p>
                                    <div className="mt-3 flex gap-2">
                                        <div className="bg-slate-800 px-3 py-1 rounded text-xs text-slate-300 border border-slate-700">
                                            <i className="fa-solid fa-map-pin text-red-400 mr-2"></i>
                                            {selectedUser.last_location || 'No Location Data'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Map */}
                            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                                <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur flex justify-between items-center">
                                    <h3 className="font-bold text-white"><i className="fa-solid fa-map-location-dot mr-2 text-brand-500"></i>Recent Activity Map</h3>
                                </div>
                                <div className="p-4">
                                    {loadingSessions ? (
                                        <div className="h-64 flex items-center justify-center text-slate-500"><i className="fa-solid fa-circle-notch fa-spin text-2xl"></i></div>
                                    ) : userSessions.length > 0 && userSessions[0].route && userSessions[0].route.length > 0 ? (
                                        <>
                                            <RouteMap route={userSessions[0].route} className="h-96 w-full rounded-xl" />
                                            <div className="mt-2 text-xs text-slate-500 text-center">Showing route from latest session ({new Date(userSessions[0].startTime).toLocaleDateString()})</div>
                                        </>
                                    ) : (
                                        <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50">
                                            <i className="fa-solid fa-satellite-slash text-3xl mb-2 opacity-50"></i>
                                            <p>No GPS Data Available</p>
                                            <p className="text-xs">User hasn't recorded a GPS session recently.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Session History */}
                            <div>
                                <h3 className="font-bold text-white mb-4 text-lg">Recent Sessions</h3>
                                {loadingSessions ? (
                                    <div className="text-center py-8 text-slate-500"><i className="fa-solid fa-circle-notch fa-spin"></i></div>
                                ) : userSessions.length > 0 ? (
                                    <div className="grid gap-3">
                                        {userSessions.map(session => (
                                            <div key={session.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center hover:bg-slate-750 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                                                        <i className="fa-solid fa-person-walking"></i>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm">
                                                            {new Date(session.startTime).toLocaleDateString()}
                                                            <span className="text-slate-500 font-normal ml-2">{new Date(session.startTime).toLocaleTimeString()}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-400">
                                                            {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s duration
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-brand-400 text-lg">{session.steps}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Steps</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">No session history found.</p>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                            <i className="fa-solid fa-user-astronaut text-6xl mb-4 opacity-20"></i>
                            <p className="text-lg font-medium">Select a user to view details</p>
                            <p className="text-sm">View their location, steps, and activity history</p>
                        </div>
                    )}
               </div>
           </div>
       </div>
    </div>
  );
};
