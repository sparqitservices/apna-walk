import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, UserProfile } from '../types';
import { usePedometer } from '../hooks/usePedometer'; 
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

  // Sync state if props change (though typically this modal manages its own cycle)
  useEffect(() => {
    if (isOpen) {
        setTempSettings(settings);
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

    // Simulate small delay for premium feel
    await new Promise(r => setTimeout(r, 800));
    
    onSave(tempSettings, tempProfile);
    setIsUpdating(false);
    setUpdateSuccess(true);
    
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);

    // Auto close after showing success for a moment
    setTimeout(() => {
        onClose();
        setUpdateSuccess(false);
    }, 1000);
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
      <div className="bg-dark-card w-full max-w-xl h-[92vh] rounded-[3rem] overflow-hidden border border-slate-800 shadow-2xl relative flex flex-col animate-message-pop">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40 sticky top-0 z-20">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20">
                <i className="fa-solid fa-user-gear"></i>
             </div>
             <div>
                <h2 className="text-white font-black text-xl tracking-tighter uppercase italic">Profile Hub</h2>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Global Preferences</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 border border-slate-700">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar">
          
          {/* Identity Card */}
          <div className="bg-slate-800/40 p-6 rounded-[2rem] border border-slate-700/50 shadow-inner space-y-6">
             <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl overflow-hidden border-4 border-slate-700 transition-all shadow-2xl ${tempProfile.isGuest ? 'bg-slate-600' : 'bg-brand-500'}`}>
                        {tempProfile.avatar ? <img src={tempProfile.avatar} className="w-full h-full object-cover" /> : (tempProfile.username?.charAt(0).toUpperCase() || 'U')}
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i className="fa-solid fa-camera mb-1"></i>
                            <span className="text-[8px] font-black uppercase">Edit</span>
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
                <div className="flex-1 min-w-0">
                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-[2px] block mb-2 ml-1">Walking Alias</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 font-black text-lg">@</span>
                        <input 
                            value={tempProfile.username || ''} 
                            onChange={(e) => handleProfileChange('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 15))}
                            placeholder="username"
                            className="bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white font-black w-full focus:border-brand-500 outline-none transition-all focus:bg-slate-950"
                        />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-3 italic ml-1">Only your alias is seen by other walkers.</p>
                </div>
             </div>
             
             <StylishToggle 
                checked={!!tempProfile.is_ghost_mode}
                onChange={(val) => handleProfileChange('is_ghost_mode', val)}
                icon="fa-ghost"
                label="Ghost Mode"
                subLabel="Completely hide from Buddy Discovery"
                colorClass="peer-checked:bg-slate-400"
             />

             {profile.isGuest ? (
                 <button onClick={onLoginRequest} className="w-full bg-brand-600 hover:bg-brand-500 text-white py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs"><i className="fa-brands fa-google mr-2"></i>Link Account to Cloud</button>
             ) : (
                 <div className="flex gap-2">
                    <button onClick={onLogout} className="flex-1 border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 py-3 rounded-2xl font-bold transition-all text-xs uppercase tracking-widest">Sign Out</button>
                 </div>
             )}
          </div>
          
           {/* Reminders Card */}
           <div>
               <SectionHeader icon="fa-bell" title="Smart Reminders" />
               <div className="grid grid-cols-1 gap-3">
                   <StylishToggle checked={!!tempSettings.notifications?.water} onChange={(val) => handleNotificationToggle('water', val)} icon="fa-glass-water" label="Drink Water" subLabel="Contextual nudges" colorClass="peer-checked:bg-blue-500" />
                   <StylishToggle checked={!!tempSettings.notifications?.walk} onChange={(val) => handleNotificationToggle('walk', val)} icon="fa-person-walking" label="Sedentary Alert" subLabel="Move if inactive" colorClass="peer-checked:bg-brand-500" />
               </div>
           </div>

          {/* Fitness Stats Card */}
          <div>
            <SectionHeader icon="fa-ruler" title="Physical Metrics" />
            <div className="bg-slate-800/40 p-6 rounded-[2rem] border border-slate-700/50 space-y-8">
                <div>
                    <label className="flex justify-between items-end text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                        <span>Daily Goal</span>
                        <span className="text-brand-500 text-xl font-black italic">{tempSettings.stepGoal.toLocaleString()} <small className="text-[8px] font-bold not-italic">steps</small></span>
                    </label>
                    <input type="range" min="1000" max="50000" step="500" value={tempSettings.stepGoal} onChange={(e) => handleChange('stepGoal', parseInt(e.target.value))} className="w-full accent-brand-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Weight (Kg)</label>
                        <input type="number" value={tempSettings.weightKg} onChange={(e) => handleChange('weightKg', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-brand-500" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Height (Cm)</label>
                        <input type="number" value={tempSettings.heightCm} onChange={(e) => handleChange('heightCm', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-brand-500" />
                    </div>
                </div>
            </div>
          </div>

          {/* Appearance Card */}
          <div>
            <SectionHeader icon="fa-palette" title="App Aesthetics" />
            <div className="grid grid-cols-5 gap-4 px-2">
                {themes.map((theme) => (
                    <button key={theme.id} onClick={() => handleChange('theme', theme.id as any)} className="flex flex-col items-center gap-2 group relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tempSettings.theme === theme.id ? 'ring-4 ring-white/20 ring-offset-4 ring-offset-dark-card scale-110 shadow-2xl' : 'opacity-40 hover:opacity-100 hover:scale-105'}`} style={{ backgroundColor: theme.color }}>
                            {tempSettings.theme === theme.id && <i className="fa-solid fa-check text-white drop-shadow-md"></i>}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${tempSettings.theme === theme.id ? 'text-white' : 'text-slate-500'}`}>{theme.name}</span>
                    </button>
                ))}
            </div>
          </div>

        </div>
        
        {/* ACTION FOOTER */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-20">
            <button 
                onClick={handleSave} 
                disabled={isUpdating || updateSuccess}
                className={`w-full py-5 rounded-[1.5rem] font-black transition-all shadow-2xl flex items-center justify-center gap-3 overflow-hidden group relative active:scale-95 ${
                    updateSuccess 
                    ? 'bg-green-500 text-white' 
                    : 'bg-brand-600 hover:bg-brand-500 text-white'
                }`}
            >
                {isUpdating ? (
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-circle-notch fa-spin text-xl"></i>
                        <span className="uppercase tracking-[4px] text-xs">Syncing...</span>
                    </div>
                ) : updateSuccess ? (
                    <div className="flex items-center gap-2 animate-message-pop">
                        <i className="fa-solid fa-circle-check text-xl"></i>
                        <span className="uppercase tracking-[4px] text-xs">Updated Shabaash!</span>
                    </div>
                ) : (
                    <>
                        <span className="uppercase tracking-[6px] text-xs">Update Preferences</span>
                        <i className="fa-solid fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
                    </>
                )}
                
                {/* Visual ripple effect background */}
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>
        </div>
      </div>
    </div>
  );
};