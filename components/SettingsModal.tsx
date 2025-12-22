
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

const SectionHeader = ({ icon, title, badge }: { icon: string, title: string, badge?: string }) => (
    <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-brand-400 text-[10px] font-black uppercase tracking-[4px] flex items-center gap-2">
            <i className={`fa-solid ${icon}`}></i> {title}
        </h3>
        {badge && <span className="text-[8px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{badge}</span>}
    </div>
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
    <div className="flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-all group">
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-all ${checked ? 'bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-slate-800 text-slate-500'}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
                <div className={`font-bold text-sm transition-colors ${checked ? 'text-white' : 'text-slate-400'}`}>{label}</div>
                {subLabel && <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{subLabel}</div>}
            </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                className="sr-only peer"
                checked={checked}
                onChange={(e) => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    onChange(e.target.checked);
                }}
            />
            <div className={`w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-brand-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${colorClass} shadow-inner`}></div>
        </label>
    </div>
);

const InputField = ({ label, icon, value, onChange, placeholder, type = "text", suffix }: { label: string, icon: string, value: any, onChange: (val: any) => void, placeholder?: string, type?: string, suffix?: string }) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <input 
                type={type}
                value={value}
                onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-14 text-sm text-white focus:border-brand-500 focus:bg-white/[0.08] outline-none transition-all placeholder:text-slate-600 font-bold"
            />
            {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-500 uppercase tracking-wider">{suffix}</span>}
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
        setTempSettings({ 
            ...settings,
            // Ensure new fields are initialized
            coachVoiceEnabled: settings.coachVoiceEnabled ?? true,
            notifications: {
                ...settings.notifications,
                achievements: settings.notifications.achievements ?? true
            }
        });
        setTempProfile({ ...profile });
        setUpdateSuccess(false);
    }
  }, [isOpen, settings, profile]);

  if (!isOpen) return null;

  const handleSettingChange = (field: keyof UserSettings, value: any) => {
    let newSettings = { ...tempSettings, [field]: value };
    if (field === 'heightCm') {
        newSettings.strideLengthCm = Math.round(Number(value) * 0.415);
    }
    setTempSettings(newSettings);
  };

  const handleNotificationChange = (key: keyof UserSettings['notifications'], val: boolean) => {
    if (val) requestNotificationPermission();
    setTempSettings(prev => ({
        ...prev,
        notifications: { ...prev.notifications, [key]: val }
    }));
  };

  const handleProfileChange = (field: keyof UserProfile, value: any) => {
    setTempProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    setUpdateSuccess(false);
    if (navigator.vibrate) navigator.vibrate(30);
    
    // Simulate sync
    await new Promise(r => setTimeout(r, 1000));
    
    onSave(tempSettings, tempProfile);
    setIsUpdating(false);
    setUpdateSuccess(true);
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0a0f14] w-full max-w-2xl h-full sm:h-[92vh] sm:rounded-[3.5rem] overflow-hidden border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative flex flex-col animate-message-pop">
        
        {/* Header - Glassy */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40 sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-[1.2rem] bg-brand-600/10 flex items-center justify-center text-brand-500 border border-brand-500/20">
                <i className="fa-solid fa-user-gear text-xl"></i>
             </div>
             <div>
                <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic leading-none">Settings</h2>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px] mt-1">Command Center</p>
             </div>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 border border-white/5">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-12 no-scrollbar pb-32">
          
          {/* Identity & Profile */}
          <div className="space-y-8">
               <div className="flex flex-col items-center mb-8">
                    <div className="relative group cursor-pointer">
                        <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-tr from-brand-600 to-emerald-400 p-1 shadow-2xl">
                             <div className="w-full h-full rounded-[2.2rem] bg-slate-900 overflow-hidden border-4 border-slate-900">
                                <img src={tempProfile.avatar || 'https://www.gravatar.com/avatar?d=mp'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                             </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-xl border-4 border-[#0a0f14] group-active:scale-90 transition-transform">
                            <i className="fa-solid fa-camera text-xs"></i>
                        </div>
                    </div>
                    <h3 className="text-white font-black text-xl mt-4 italic tracking-tight">@{tempProfile.username || 'walker'}</h3>
                    <div className="bg-brand-500/10 text-brand-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-brand-500/20 mt-1">Verified Member</div>
               </div>

               <SectionHeader icon="fa-fingerprint" title="Identity" />
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <InputField label="Display Name" icon="fa-user" value={tempProfile.name} onChange={(v) => handleProfileChange('name', v)} />
                   <InputField label="Unique Handle" icon="fa-at" value={tempProfile.username || ''} onChange={(v) => handleProfileChange('username', v)} />
               </div>
               <InputField label="Short Bio" icon="fa-quote-left" value={tempProfile.bio || ''} onChange={(v) => handleProfileChange('bio', v)} placeholder="Keep walking..." />
          </div>

          {/* Core Goals */}
          <div className="space-y-6">
               <SectionHeader icon="fa-bullseye" title="Activity Matrix" />
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                   <InputField type="number" label="Daily Steps" icon="fa-shoe-prints" value={tempSettings.stepGoal} onChange={(v) => handleSettingChange('stepGoal', v)} suffix="Steps" />
                   <InputField type="number" label="Distance" icon="fa-route" value={(tempSettings.distanceGoal || 5000) / 1000} onChange={(v) => handleSettingChange('distanceGoal', v * 1000)} suffix="KM" />
                   <InputField type="number" label="Calories" icon="fa-fire" value={tempSettings.calorieGoal || 300} onChange={(v) => handleSettingChange('calorieGoal', v)} suffix="KCAL" />
               </div>
          </div>

          {/* Notifications Center */}
          <div className="space-y-6">
               <SectionHeader icon="fa-bell" title="Notifications" badge="Real-time" />
               <div className="grid grid-cols-1 gap-3">
                   <StylishToggle 
                        checked={tempSettings.notifications.water} 
                        onChange={(v) => handleNotificationChange('water', v)}
                        icon="fa-glass-water"
                        label="Hydration Nudges"
                        subLabel="Timely reminders to drink water"
                   />
                   <StylishToggle 
                        checked={tempSettings.notifications.walk} 
                        onChange={(v) => handleNotificationChange('walk', v)}
                        icon="fa-person-walking"
                        label="Activity Alerts"
                        subLabel="Nudges when you're sedentary"
                        colorClass="peer-checked:bg-blue-500"
                   />
                   <StylishToggle 
                        checked={tempSettings.notifications.breath} 
                        onChange={(v) => handleNotificationChange('breath', v)}
                        icon="fa-lungs"
                        label="Zen Reminders"
                        subLabel="Mindful breathing prompts"
                        colorClass="peer-checked:bg-purple-500"
                   />
                   <StylishToggle 
                        checked={tempSettings.notifications.achievements} 
                        onChange={(v) => handleNotificationChange('achievements', v)}
                        icon="fa-medal"
                        label="Glory Alerts"
                        subLabel="New badges and weekly summaries"
                        colorClass="peer-checked:bg-orange-500"
                   />
               </div>
          </div>

          {/* Apna Coach Features */}
          <div className="space-y-6">
               <SectionHeader icon="fa-robot" title="Coach Intelligence" />
               <div className="grid grid-cols-1 gap-4">
                   <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                                    <i className="fa-solid fa-volume-high text-lg"></i>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Voice Motivation</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Speak insights automatically</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={tempSettings.coachVoiceEnabled} onChange={e => handleSettingChange('coachVoiceEnabled', e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500 shadow-inner"></div>
                            </label>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Vibe Selection</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Energetic', 'Strict', 'Chill'] as const).map(vibe => (
                                    <button 
                                        key={vibe}
                                        onClick={() => handleSettingChange('coachVibe', vibe)}
                                        className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${tempSettings.coachVibe === vibe ? 'bg-brand-600 border-brand-400 text-white shadow-lg' : 'bg-slate-800/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {vibe}
                                    </button>
                                ))}
                            </div>
                        </div>
                   </div>
               </div>
          </div>

          {/* Privacy & Safety */}
          <div className="space-y-6">
               <SectionHeader icon="fa-shield-halved" title="Privacy Vault" />
               <div className="grid grid-cols-1 gap-3">
                   <StylishToggle 
                        checked={!!tempProfile.is_ghost_mode} 
                        onChange={(val) => handleProfileChange('is_ghost_mode', val)} 
                        icon="fa-ghost" 
                        label="Ghost Mode" 
                        subLabel="Hide profile from discovery scans" 
                        colorClass="peer-checked:bg-slate-600" 
                   />
                   <StylishToggle 
                        checked={!!tempProfile.share_live_location} 
                        onChange={(val) => handleProfileChange('share_live_location', val)} 
                        icon="fa-location-dot" 
                        label="Squad Sharing" 
                        subLabel="Allow friends to see your live walk" 
                        colorClass="peer-checked:bg-emerald-500"
                   />
               </div>
          </div>

          {/* Account Actions */}
          <div className="pt-10 border-t border-white/5 space-y-4">
                <SectionHeader icon="fa-triangle-exclamation" title="Danger Zone" />
                <button 
                    onClick={() => { if(confirm("Are you sure? You will be signed out from your cloud account. Local progress remains.")) onLogout(); }}
                    className="w-full py-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[1.8rem] text-[11px] font-black uppercase tracking-[4px] hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] group flex items-center justify-center gap-3 shadow-xl"
                >
                    <i className="fa-solid fa-power-off group-hover:rotate-90 transition-transform duration-500"></i> Disconnect Account
                </button>
                <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest text-center">Version {CURRENT_APP_VERSION} • Sparq IT Service</p>
          </div>

        </div>
        
        {/* Fixed Footer Action */}
        <div className="p-6 sm:p-8 bg-slate-900/80 backdrop-blur-2xl border-t border-white/10 sticky bottom-0 z-30">
            <button 
                onClick={handleSave}
                disabled={isUpdating}
                className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[6px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all transform active:scale-95 flex items-center justify-center gap-4 ${updateSuccess ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white'}`}
            >
                {isUpdating ? (
                    <i className="fa-solid fa-satellite-dish fa-spin"></i>
                ) : updateSuccess ? (
                    <><i className="fa-solid fa-check"></i> Profile Synced</>
                ) : (
                    <><i className="fa-solid fa-cloud-arrow-up"></i> Save & Sync</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

// Access version for footer
const CURRENT_APP_VERSION = "2.4.0"; 
