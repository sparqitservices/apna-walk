
import React, { useState, useRef } from 'react';
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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${checked ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-500'}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
                <div className={`font-bold text-sm ${checked ? 'text-white' : 'text-slate-400'}`}>{label}</div>
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
  const [calibrationState, setCalibrationState] = useState<'idle' | 'walking' | 'done'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { calibrateSensitivity } = usePedometer();

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

  const handleSave = () => {
    onSave(tempSettings, tempProfile);
    onClose();
  };
  
  const handleCalibrate = () => {
      setCalibrationState('walking');
      calibrateSensitivity((recommended) => {
          setCalibrationState('done');
          handleChange('sensitivity', recommended);
      });
  };

  const themes = [
    { id: 'green', name: 'Vitality', color: '#22c55e' },
    { id: 'blue', name: 'Ocean', color: '#3b82f6' },
    { id: 'orange', name: 'Sunset', color: '#f59e0b' },
    { id: 'purple', name: 'Royal', color: '#a855f7' },
    { id: 'pink', name: 'Rose', color: '#f43f5e' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-lg rounded-3xl overflow-hidden border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto relative flex flex-col">
        
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/90 backdrop-blur sticky top-0 z-20">
          <div>
            <h2 className="text-white font-bold text-xl">Settings</h2>
            <p className="text-slate-400 text-xs">Personalize your ApnaWalk</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto">
          
          {/* Profile Identity Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
             <div className="flex items-center gap-5">
                <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl overflow-hidden border-4 border-slate-700 transition-all shadow-xl ${tempProfile.isGuest ? 'bg-slate-600' : 'bg-brand-500'}`}>
                        {tempProfile.avatar ? <img src={tempProfile.avatar} className="w-full h-full object-cover" /> : tempProfile.username?.charAt(0).toUpperCase() || 'U'}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-camera"></i></div>
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
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Walking Alias</label>
                    <input 
                        value={tempProfile.username || ''} 
                        onChange={(e) => handleProfileChange('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 12))}
                        placeholder="Choose username"
                        className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold w-full focus:border-brand-500 outline-none"
                    />
                    <p className="text-[9px] text-slate-500 mt-2 italic">Only your username is visible to other walkers.</p>
                </div>
             </div>
             
             {/* Ghost Mode Privacy */}
             <StylishToggle 
                checked={!!tempProfile.is_ghost_mode}
                onChange={(val) => handleProfileChange('is_ghost_mode', val)}
                icon="fa-ghost"
                label="Ghost Mode"
                subLabel="Hide your profile from Discovery"
                colorClass="peer-checked:bg-slate-500"
             />

             {profile.isGuest ? (
                 <button onClick={onLoginRequest} className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95"><i className="fa-brands fa-google mr-2"></i>Sign In to Cloud</button>
             ) : (
                 <button onClick={onLogout} className="w-full border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 py-3 rounded-xl font-bold transition-all text-sm">Sign Out</button>
             )}
          </div>
          
           {/* Notifications */}
           <div>
               <h3 className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><i className="fa-solid fa-bell"></i> Reminders</h3>
               <div className="space-y-3">
                   <StylishToggle checked={!!tempSettings.notifications?.water} onChange={(val) => handleNotificationToggle('water', val)} icon="fa-glass-water" label="Hydration" subLabel="Every 2 hours" colorClass="peer-checked:bg-blue-500" />
                   <StylishToggle checked={!!tempSettings.notifications?.walk} onChange={(val) => handleNotificationToggle('walk', val)} icon="fa-person-walking" label="Movement" subLabel="Every 4 hours" colorClass="peer-checked:bg-brand-500" />
               </div>
           </div>

          {/* Theme */}
          <div>
            <h3 className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><i className="fa-solid fa-palette"></i> App Vibe</h3>
            <div className="grid grid-cols-5 gap-3">
                {themes.map((theme) => (
                    <button key={theme.id} onClick={() => handleChange('theme', theme.id as any)} className="flex flex-col items-center gap-2 group">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${tempSettings.theme === theme.id ? 'border-white scale-110 shadow-xl' : 'border-transparent opacity-60'}`} style={{ backgroundColor: theme.color }}>
                            {tempSettings.theme === theme.id && <i className="fa-solid fa-check text-white drop-shadow-md"></i>}
                        </div>
                    </button>
                ))}
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-6 pt-6 border-t border-slate-700/50">
             <div>
                <label className="flex justify-between text-sm font-bold text-slate-300 mb-2"><span>Daily Step Goal</span><span className="text-brand-500 font-mono text-lg">{tempSettings.stepGoal.toLocaleString()}</span></label>
                <input type="range" min="1000" max="50000" step="500" value={tempSettings.stepGoal} onChange={(e) => handleChange('stepGoal', parseInt(e.target.value))} className="w-full accent-brand-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
             </div>
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-700 bg-slate-900 sticky bottom-0 z-20">
            <button onClick={handleSave} className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 text-xs uppercase tracking-[2px]">Update ApnaWalk</button>
        </div>
      </div>
    </div>
  );
};
