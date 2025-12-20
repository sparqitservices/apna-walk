import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, UserProfile } from '../types';
import { requestNotificationPermission } from '../services/notificationService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  profile: UserProfile;
  onSave: (newSettings: UserSettings, newProfile: UserProfile) => void;
  onLogout: () => void;
  onLoginRequest: () => void;
}

const SectionHeader = ({ icon, title }: { icon: string, title: string }) => (
    <h3 className="text-brand-400 text-[10px] font-black uppercase tracking-[3px] mb-4 flex items-center gap-2 ml-1">
        <i className={`fa-solid ${icon}`}></i> {title}
    </h3>
);

const StylishToggle = ({ 
    checked, 
    onChange, 
    icon, 
    label, 
    subLabel, 
    colorClass = "peer-checked:bg-brand-500" 
}: { 
    checked: boolean, 
    onChange: (checked: boolean) => void, 
    icon: string, 
    label: string, 
    subLabel?: string,
    colorClass?: string
}) => (
    <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/60 transition-all group">
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${checked ? 'bg-white text-slate-900 shadow-lg' : 'bg-slate-700/50 text-slate-500'}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
                <div className={`font-bold text-sm transition-colors ${checked ? 'text-white' : 'text-slate-400'}`}>{label}</div>
                {subLabel && <div className="text-[10px] text-slate-500 font-medium">{subLabel}</div>}
            </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className={`w-12 h-6 bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-brand-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${colorClass} shadow-inner`}></div>
        </label>
    </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, settings, profile, onSave, onLogout, onLoginRequest 
}) => {
  const [tempSettings, setTempSettings] = useState<UserSettings>(settings);
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setTempSettings(prev => ({ ...prev, ...settings }));
        setTempProfile(profile);
        setUpdateSuccess(false);
    }
  }, [isOpen, settings, profile]);

  if (!isOpen) return null;

  const handleChange = (field: keyof UserSettings, value: any) => {
    let newSettings = { ...tempSettings, [field]: value };
    if (field === 'heightCm') {
        const estimatedStride = Math.round(value * 0.415);
        newSettings.strideLengthCm = estimatedStride;
    }
    setTempSettings(newSettings);
  };

  const handleProfileChange = (field: keyof UserProfile, value: any) => {
      setTempProfile(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNotificationToggle = async (key: 'water' | 'walk' | 'breath', value: boolean) => {
      if (value) {
          const granted = await requestNotificationPermission();
          if (!granted) {
              alert("Please allow notifications in your browser settings to use this feature.");
              return;
          }
      }
      setTempSettings(prev => ({
          ...prev,
          notifications: {
              ...prev.notifications,
              [key]: value
          }
      }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    setUpdateSuccess(false);
    
    if (navigator.vibrate) navigator.vibrate(20);
    await new Promise(r => setTimeout(r, 1200));
    
    onSave(tempSettings, tempProfile);
    setIsUpdating(false);
    setUpdateSuccess(true);
    
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);

    setTimeout(() => {
        onClose();
        setUpdateSuccess(false);
    }, 1500);
  };

  const themes = [
    { id: 'green', name: 'Vitality', color: '#22c55e' },
    { id: 'blue', name: 'Ocean', color: '#3b82f6' },
    { id: 'orange', name: 'Sunset', color: '#f59e0b' },
    { id: 'purple', name: 'Royal', color: '#a855f7' },
    { id: 'pink', name: 'Rose', color: '#f43f5e' }
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-xl h-[92vh] rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col animate-message-pop">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40 sticky top-0 z-20">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20">
                <i className="fa-solid fa-house-user"></i>
             </div>
             <div>
                <h2 className="text-white font-black text-xl tracking-tighter uppercase italic">Apna Kona</h2>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Personal Space</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 border border-slate-700 shadow-lg">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar pb-24">
          
          {/* Account Identity Card */}
          <div className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-white/5 shadow-inner space-y-8">
             <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <div className={`w-28 h-28 rounded-[2.2rem] flex items-center justify-center text-white font-black text-4xl overflow-hidden border-4 border-slate-700 transition-all shadow-2xl ${tempProfile.isGuest ? 'bg-slate-600' : 'bg-brand-50'}`}>
                        {tempProfile.avatar ? <img src={tempProfile.avatar} className="w-full h-full object-cover" /> : (tempProfile.username?.charAt(0).toUpperCase() || 'U')}
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i className="fa-solid fa-camera mb-1 text-white"></i>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white">Update</span>
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => handleProfileChange('avatar', reader.result as string);
                            reader.readAsDataURL(file);
                        }
                    }} />
                </div>
                
                <div className="flex-1 min-w-0 w-full">
                    <div className="space-y-5">
                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5 shadow-sm">
                            <label className="text-[8px] text-slate-500 font-black uppercase tracking-[2px] block mb-1">Logged in as</label>
                            <div className="text-white font-bold text-sm truncate flex items-center gap-2">
                                <i className="fa-solid fa-envelope text-brand-500 text-xs"></i>
                                {tempProfile.email || 'Guest Mode'}
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-[2px] block mb-2 ml-1">Walking Alias</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 font-black text-lg transition-colors group-focus-within:text-brand-400">@</span>
                                <input 
                                    value={tempProfile.username || ''} 
                                    onChange={(e) => handleProfileChange('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 15))}
                                    placeholder="username"
                                    className="bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-white font-black w-full focus:border-brand-500 outline-none transition-all focus:bg-slate-950 shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                </div>
             </div>
             
             <div className="pt-2">
                <StylishToggle 
                    checked={!!tempProfile.is_ghost_mode}
                    onChange={(val) => handleProfileChange('is_ghost_mode', val)}
                    icon="fa-ghost"
                    label="Ghost Mode"
                    subLabel="Hide your profile from Discovery map"
                    colorClass="peer-checked:bg-slate-500"
                />
             </div>

             {profile.isGuest ? (
                 <button onClick={onLoginRequest} className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-100">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
                    Secure Account to Cloud
                 </button>
             ) : (
                <button 
                  onClick={onLogout} 
                  className="w-full group relative flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-2xl overflow-hidden transition-all hover:from-red-500 hover:to-red-600 active:scale-95 shadow-lg shadow-red-950/20"
                >
                    <div className="absolute inset-0 bg-white/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 pointer-events-none"></div>
                    <i className="fa-solid fa-right-from-bracket text-red-500 group-hover:text-white transition-colors"></i>
                    <span className="text-red-500 group-hover:text-white font-black text-[10px] uppercase tracking-[4px] transition-colors">Exit Session</span>
                </button>
             )}
          </div>

          {/* Daily Targets Hub */}
          <div>
            <SectionHeader icon="fa-bullseye" title="Daily Targets" />
            <div className="bg-slate-800/40 p-7 rounded-[2.5rem] border border-white/5 space-y-10 shadow-inner">
                {/* Steps Goal */}
                <div>
                    <div className="flex justify-between items-end mb-4 ml-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Step Goal</label>
                        <span className="text-brand-500 text-2xl font-black italic tabular-nums">{tempSettings.stepGoal.toLocaleString()}</span>
                    </div>
                    <input type="range" min="1000" max="50000" step="500" value={tempSettings.stepGoal} onChange={(e) => handleChange('stepGoal', parseInt(e.target.value))} className="w-full accent-brand-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                </div>

                {/* Distance Goal */}
                <div>
                    <div className="flex justify-between items-end mb-4 ml-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Distance (KM)</label>
                        <span className="text-blue-500 text-2xl font-black italic tabular-nums">{((tempSettings.distanceGoal || 5000) / 1000).toFixed(1)}</span>
                    </div>
                    <input type="range" min="1000" max="25000" step="500" value={tempSettings.distanceGoal || 5000} onChange={(e) => handleChange('distanceGoal', parseInt(e.target.value))} className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                </div>

                {/* Calorie Goal */}
                <div>
                    <div className="flex justify-between items-end mb-4 ml-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Calorie Target</label>
                        <span className="text-orange-500 text-2xl font-black italic tabular-nums">{tempSettings.calorieGoal || 300}</span>
                    </div>
                    <input type="range" min="50" max="2000" step="50" value={tempSettings.calorieGoal || 300} onChange={(e) => handleChange('calorieGoal', parseInt(e.target.value))} className="w-full accent-orange-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                </div>
            </div>
          </div>
          
          {/* Coach Experience */}
          <div>
            <SectionHeader icon="fa-robot" title="AI Experience" />
            <div className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-inner">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-[2px] block mb-2 ml-1">Coach personality</label>
                <div className="grid grid-cols-3 gap-2">
                    {['Chill', 'Energetic', 'Strict'].map((vibe) => (
                        <button 
                            key={vibe}
                            onClick={() => handleChange('coachVibe', vibe)}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${tempSettings.coachVibe === vibe ? 'bg-brand-600 text-white border-brand-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                        >
                            {vibe}
                        </button>
                    ))}
                </div>
                <p className="text-[9px] text-slate-500 mt-2 italic px-1">Adjusts how Apna Coach talks to you.</p>
            </div>
          </div>

           {/* Alerts Hub */}
           <div>
               <SectionHeader icon="fa-bell" title="Contextual Nudges" />
               <div className="grid grid-cols-1 gap-3">
                   <StylishToggle checked={!!tempSettings.notifications?.water} onChange={(val) => handleNotificationToggle('water', val)} icon="fa-glass-water" label="Smart Hydration" subLabel="Reminders based on steps" colorClass="peer-checked:bg-blue-500" />
                   <StylishToggle checked={!!tempSettings.notifications?.walk} onChange={(val) => handleNotificationToggle('walk', val)} icon="fa-person-walking" label="Activity Radar" subLabel="Move if sitting too long" colorClass="peer-checked:bg-brand-500" />
               </div>
           </div>

          {/* Body Metrics */}
          <div>
            <SectionHeader icon="fa-ruler-combined" title="Body Metrics" />
            <div className="bg-slate-800/40 p-7 rounded-[2.5rem] border border-white/5 space-y-10 shadow-inner">
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Body Weight (Kg)</label>
                        <input type="number" value={tempSettings.weightKg} onChange={(e) => handleChange('weightKg', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-black outline-none focus:border-brand-500 transition-all focus:bg-slate-950" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Height (Cm)</label>
                        <input type="number" value={tempSettings.heightCm} onChange={(e) => handleChange('heightCm', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-black outline-none focus:border-brand-500 transition-all focus:bg-slate-950" />
                    </div>
                </div>
            </div>
          </div>

          {/* Aesthetics */}
          <div>
            <SectionHeader icon="fa-wand-magic-sparkles" title="Vibe & Mood" />
            <div className="grid grid-cols-5 gap-4 px-2">
                {themes.map((theme) => (
                    <button key={theme.id} onClick={() => handleChange('theme', theme.id as any)} className="flex flex-col items-center gap-3 group relative">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${tempSettings.theme === theme.id ? 'ring-[3px] ring-white/30 ring-offset-4 ring-offset-[#1a2327] scale-110 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'opacity-30 hover:opacity-100 hover:scale-105'}`} style={{ backgroundColor: theme.color }}>
                            {tempSettings.theme === theme.id && <i className="fa-solid fa-check text-white text-lg drop-shadow-md"></i>}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-[2px] transition-colors ${tempSettings.theme === theme.id ? 'text-white' : 'text-slate-500'}`}>{theme.name}</span>
                    </button>
                ))}
            </div>
          </div>

        </div>
        
        {/* REFINED SAVE FOOTER */}
        <div className="p-7 border-t border-white/5 bg-slate-900/90 backdrop-blur-md sticky bottom-0 z-20">
            <button 
                onClick={handleSave} 
                disabled={isUpdating || updateSuccess}
                className={`w-full py-5 rounded-[1.8rem] font-black transition-all shadow-2xl flex items-center justify-center gap-3 overflow-hidden group relative active:scale-[0.98] ${
                    updateSuccess 
                    ? 'bg-green-500 text-white' 
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/20'
                }`}
            >
                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-1000 ease-out pointer-events-none"></div>
                
                {isUpdating ? (
                    <div className="flex items-center gap-3 relative z-10">
                        <i className="fa-solid fa-sync fa-spin text-xl"></i>
                        <span className="uppercase tracking-[4px] text-xs">Syncing to Kona...</span>
                    </div>
                ) : updateSuccess ? (
                    <div className="flex items-center gap-3 relative z-10 animate-message-pop">
                        <i className="fa-solid fa-circle-check text-2xl"></i>
                        <span className="uppercase tracking-[4px] text-xs">Settings Saved!</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 relative z-10">
                        <span className="uppercase tracking-[8px] text-xs ml-2">Update Apna Profile</span>
                        <i className="fa-solid fa-paper-plane group-hover:translate-x-2 group-hover:-translate-y-1 transition-transform"></i>
                    </div>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};