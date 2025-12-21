
import React, { useState, useEffect } from 'react';
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

const InputField = ({ label, icon, value, onChange, placeholder, type = "text", suffix }: { label: string, icon: string, value: any, onChange: (val: any) => void, placeholder?: string, type?: string, suffix?: string }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <input 
                type={type}
                value={value}
                onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl py-3.5 pl-11 pr-14 text-sm text-white focus:border-brand-500 outline-none transition-all placeholder:text-slate-600 font-bold"
            />
            {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase tracking-wider">{suffix}</span>}
        </div>
    </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, settings, profile, onSave, onLogout, onLoginRequest 
}) => {
  const [tempSettings, setTempSettings] = useState<UserSettings>(settings);
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setTempSettings({ ...settings });
        setTempProfile({ ...profile });
        setUpdateSuccess(false);
    }
  }, [isOpen, settings, profile]);

  if (!isOpen) return null;

  const handleChange = (field: keyof UserSettings, value: any) => {
    let newSettings = { ...tempSettings, [field]: value };
    // Auto-calculate stride if height changes
    if (field === 'heightCm') {
        newSettings.strideLengthCm = Math.round(Number(value) * 0.415);
    }
    setTempSettings(newSettings);
  };

  const handleProfileChange = (field: keyof UserProfile, value: any) => {
    setTempProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    setUpdateSuccess(false);
    if (navigator.vibrate) navigator.vibrate(20);
    await new Promise(r => setTimeout(r, 800));
    onSave(tempSettings, tempProfile);
    setIsUpdating(false);
    setUpdateSuccess(true);
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-xl h-[92vh] rounded-[3.5rem] overflow-hidden border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative flex flex-col animate-message-pop">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20 shadow-inner">
                <i className="fa-solid fa-user-gear text-xl"></i>
             </div>
             <div>
                <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic">Settings</h2>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px]">Customize your ApnaWalk</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 border border-slate-700 shadow-lg">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar pb-32">
          
          {/* Identity Section */}
          <div className="space-y-6">
               <SectionHeader icon="fa-fingerprint" title="Identity" />
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <InputField label="Full Name" icon="fa-user" value={tempProfile.name} onChange={(v) => handleProfileChange('name', v)} />
                   <InputField label="Username" icon="fa-at" value={tempProfile.username || ''} onChange={(v) => handleProfileChange('username', v)} />
               </div>
          </div>

          {/* Activity Goals Section */}
          <div className="space-y-6">
               <SectionHeader icon="fa-bullseye" title="Activity Goals" />
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                   <InputField type="number" label="Daily Steps" icon="fa-shoe-prints" value={tempSettings.stepGoal} onChange={(v) => handleChange('stepGoal', v)} suffix="Steps" />
                   <InputField type="number" label="Distance" icon="fa-route" value={(tempSettings.distanceGoal || 5000) / 1000} onChange={(v) => handleChange('distanceGoal', v * 1000)} suffix="KM" />
                   <InputField type="number" label="Calories" icon="fa-fire" value={tempSettings.calorieGoal || 300} onChange={(v) => handleChange('calorieGoal', v)} suffix="KCAL" />
               </div>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mt-2">Coach will nudge you based on these targets!</p>
          </div>

          {/* Health Metrics Section */}
          <div className="space-y-6">
               <SectionHeader icon="fa-heart-pulse" title="Health Metrics" />
               <div className="grid grid-cols-2 gap-5">
                   <InputField type="number" label="Weight" icon="fa-weight-hanging" value={tempSettings.weightKg} onChange={(v) => handleChange('weightKg', v)} suffix="KG" />
                   <InputField type="number" label="Height" icon="fa-arrows-up-down" value={tempSettings.heightCm} onChange={(v) => handleChange('heightCm', v)} suffix="CM" />
               </div>
               <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-ruler-horizontal text-slate-500"></i>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dynamic Stride</span>
                    </div>
                    <span className="text-brand-400 font-black text-sm italic">{tempSettings.strideLengthCm} CM</span>
               </div>
          </div>

          {/* NEW: Live Tracking Privacy Section */}
          <div className="space-y-6">
               <SectionHeader icon="fa-location-dot" title="Live Vibe Sharing" />
               <div className="grid grid-cols-1 gap-4">
                   <StylishToggle 
                        checked={!!tempProfile.share_live_location} 
                        onChange={(val) => handleProfileChange('share_live_location', val)} 
                        icon="fa-user-group" 
                        label="Share with Friends" 
                        subLabel="Direct buddies can see your live walk position" 
                        colorClass="peer-checked:bg-emerald-500"
                   />
                   <StylishToggle 
                        checked={!!tempProfile.share_fof_location} 
                        onChange={(val) => handleProfileChange('share_fof_location', val)} 
                        icon="fa-users-rays" 
                        label="Squad-of-Squads" 
                        subLabel="Friends-of-Friends can see your live marker" 
                        colorClass="peer-checked:bg-blue-500"
                   />
               </div>
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">Location only updates while the app is active.</p>
          </div>

          {/* App Vibe Section */}
          <div className="space-y-6">
               <SectionHeader icon="fa-wand-magic-sparkles" title="App Vibe" />
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Coach Personality</label>
                        <div className="grid grid-cols-1 gap-2">
                            {(['Energetic', 'Strict', 'Chill'] as const).map(vibe => (
                                <button 
                                    key={vibe}
                                    onClick={() => handleChange('coachVibe', vibe)}
                                    className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${tempSettings.coachVibe === vibe ? 'bg-brand-600 border-brand-400 text-white shadow-lg' : 'bg-slate-800/40 border-slate-700/50 text-slate-500 hover:text-slate-300'}`}
                                >
                                    {vibe}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Theme Palette</label>
                        <div className="grid grid-cols-5 gap-3">
                            {(['green', 'blue', 'orange', 'purple', 'pink'] as const).map(color => (
                                <button 
                                    key={color}
                                    onClick={() => handleChange('theme', color)}
                                    className={`aspect-square rounded-xl transition-all border-2 relative overflow-hidden group ${tempSettings.theme === color ? 'border-white scale-110 shadow-xl' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                    style={{ backgroundColor: color === 'green' ? '#4CAF50' : color === 'blue' ? '#2196F3' : color === 'orange' ? '#FF9800' : color === 'purple' ? '#9C27B0' : '#E91E63' }}
                                >
                                    {tempSettings.theme === color && <i className="fa-solid fa-check absolute inset-0 flex items-center justify-center text-white text-[10px]"></i>}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight text-center mt-2">Choose the hue for your journey</p>
                    </div>
               </div>
          </div>

          {/* Privacy Section */}
          <div className="space-y-6">
               <SectionHeader icon="fa-shield-halved" title="Privacy Vault" />
               <div className="grid grid-cols-1 gap-4">
                   <StylishToggle 
                        checked={!!tempProfile.is_stats_public} 
                        onChange={(val) => handleProfileChange('is_stats_public', val)} 
                        icon="fa-chart-simple" 
                        label="Public Stats" 
                        subLabel="Allow squad members to see your achievements" 
                   />
                   <StylishToggle 
                        checked={!!tempProfile.is_ghost_mode} 
                        onChange={(val) => handleProfileChange('is_ghost_mode', val)} 
                        icon="fa-ghost" 
                        label="Ghost Mode" 
                        subLabel="Hide from discovery scans entirely" 
                        colorClass="peer-checked:bg-slate-600" 
                   />
               </div>
          </div>

          {/* Account Actions */}
          <div className="pt-6">
               <button 
                   onClick={() => { if(confirm("Are you sure? Local data will remain but you'll be signed out.")) onLogout(); }}
                   className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl text-xs font-black uppercase tracking-[4px] hover:bg-red-500 hover:text-white transition-all active:scale-[0.98]"
               >
                   <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i> Logout Account
               </button>
          </div>

        </div>
        
        {/* Footer Save Button */}
        <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 sticky bottom-0 z-30">
            <button 
                onClick={handleSave}
                disabled={isUpdating}
                className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[5px] shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${updateSuccess ? 'bg-green-600 text-white' : 'bg-brand-600 text-white shadow-brand-500/40'}`}
            >
                {isUpdating ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : updateSuccess ? (
                    <><i className="fa-solid fa-check"></i> Settings Updated!</>
                ) : (
                    <><i className="fa-solid fa-floppy-disk"></i> Save Changes</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
