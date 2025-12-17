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

// Reusable Stylish Toggle Component
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
  const [calibratedValue, setCalibratedValue] = useState<number | null>(null);
  
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
  
  const handleNotificationToggle = async (key: 'water' | 'walk' | 'breath', value: boolean) => {
      if (value) {
          // User is turning ON, request permission
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

  const handleAvatarClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) {
              alert("Image size should be less than 2MB");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setTempProfile(prev => ({ ...prev, avatar: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
      e.stopPropagation();
      setTempProfile(prev => ({ ...prev, avatar: undefined }));
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    onSave(tempSettings, tempProfile);
    onClose();
  };
  
  const handleCalibrate = () => {
      setCalibrationState('walking');
      calibrateSensitivity((recommended) => {
          setCalibratedValue(recommended);
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

  const getInitials = (name: string) => {
      return name ? name.charAt(0).toUpperCase() : 'U';
  };

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
          
          {/* User Info Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
             
             <div className="flex items-center gap-5 relative z-10">
                <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden border-4 border-slate-700 group-hover:border-brand-500 transition-colors shadow-xl ${tempProfile.isGuest ? 'bg-slate-600' : 'bg-brand-500'}`}>
                        {tempProfile.avatar ? (
                            <img src={tempProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            getInitials(tempProfile.name)
                        )}
                        
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i className="fa-solid fa-camera text-white text-sm"></i>
                        </div>
                    </div>
                    {tempProfile.avatar && (
                        <button onClick={handleRemoveAvatar} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-800 z-10 shadow-md">
                            <i className="fa-solid fa-xmark text-[10px] text-white"></i>
                        </button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-xl truncate">{tempProfile.name || 'Guest User'}</h3>
                    <p className="text-slate-400 text-xs truncate mb-3">{tempProfile.email || 'Guest Mode'}</p>
                    
                    {profile.isGuest ? (
                        <button onClick={onLoginRequest} className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-full font-bold transition-colors shadow-lg shadow-brand-500/20">
                            <i className="fa-brands fa-google mr-1"></i> Sign In to Sync
                        </button>
                    ) : (
                        <button onClick={onLogout} className="text-xs bg-slate-700 hover:bg-red-500/20 hover:text-red-400 text-slate-300 px-3 py-1.5 rounded-full font-bold transition-colors border border-slate-600 hover:border-red-500/50">
                            Sign Out
                        </button>
                    )}
                </div>
             </div>
          </div>
          
           {/* Notifications Section */}
           <div>
               <h3 className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                   <i className="fa-solid fa-bell"></i> Reminders & Alerts
               </h3>
               <div className="space-y-3">
                   <StylishToggle 
                        checked={!!tempSettings.notifications?.water}
                        onChange={(val) => handleNotificationToggle('water', val)}
                        icon="fa-glass-water"
                        label="Hydration Reminders"
                        subLabel="Get notified every 2 hours to drink water"
                        colorClass="peer-checked:bg-blue-500"
                   />
                   <StylishToggle 
                        checked={!!tempSettings.notifications?.walk}
                        onChange={(val) => handleNotificationToggle('walk', val)}
                        icon="fa-person-walking"
                        label="Movement Alerts"
                        subLabel="Nudge if inactive for 4 hours"
                        colorClass="peer-checked:bg-brand-500"
                   />
                   <StylishToggle 
                        checked={!!tempSettings.notifications?.breath}
                        onChange={(val) => handleNotificationToggle('breath', val)}
                        icon="fa-lungs"
                        label="Breathing Exercises"
                        subLabel="Mindfulness reminders every 3 hours"
                        colorClass="peer-checked:bg-cyan-500"
                   />
               </div>
           </div>

          {/* Location Section */}
          <div>
              <h3 className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                   <i className="fa-solid fa-location-dot"></i> GPS & Weather
              </h3>
              <div className="bg-slate-800/20 rounded-2xl p-1 border border-slate-700/50">
                <StylishToggle 
                    checked={tempSettings.enableLocation}
                    onChange={(val) => handleChange('enableLocation', val)}
                    icon="fa-map-location-dot"
                    label="Enable Location Services"
                    subLabel="Required for route mapping and local weather"
                    colorClass="peer-checked:bg-purple-500"
                />
              </div>
          </div>

          {/* Theme Section */}
          <div>
            <h3 className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fa-solid fa-palette"></i> App Theme
            </h3>
            <div className="grid grid-cols-5 gap-3">
                {themes.map((theme) => (
                    <button 
                        key={theme.id}
                        onClick={() => handleChange('theme', theme.id)}
                        className="group flex flex-col items-center gap-2"
                    >
                        <div 
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all shadow-lg ${tempSettings.theme === theme.id ? 'border-white scale-110 shadow-xl' : 'border-transparent opacity-60 group-hover:opacity-100'}`}
                            style={{ backgroundColor: theme.color }}
                        >
                            {tempSettings.theme === theme.id && <i className="fa-solid fa-check text-white text-lg drop-shadow-md"></i>}
                        </div>
                        <span className={`text-[10px] font-bold ${tempSettings.theme === theme.id ? 'text-white' : 'text-slate-500'}`}>{theme.name}</span>
                    </button>
                ))}
            </div>
          </div>

          {/* Calibration & Goals */}
          <div className="space-y-6 pt-6 border-t border-slate-700/50">
             
             {/* Sensitivity */}
             <div>
                <div className="flex justify-between items-end mb-2">
                    <label className="text-sm font-bold text-slate-300">Sensor Sensitivity</label>
                    <div className="flex items-center gap-2">
                         {calibrationState === 'idle' && (
                            <button onClick={handleCalibrate} className="text-[10px] bg-slate-700 hover:bg-brand-600 text-white px-2 py-1 rounded transition-colors">
                                Auto-Calibrate
                            </button>
                         )}
                         <span className="text-brand-500 font-mono font-bold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">{tempSettings.sensitivity}</span>
                    </div>
                </div>
                
                {calibrationState === 'walking' && (
                    <div className="bg-brand-500/10 border border-brand-500/30 p-3 rounded-xl mb-3 flex items-center justify-center gap-3 animate-pulse">
                        <i className="fa-solid fa-person-walking text-brand-500 text-xl"></i>
                        <span className="text-sm font-bold text-brand-400">Walk normally for 5 seconds...</span>
                    </div>
                )}
                
                <input 
                    type="range" min="1" max="5" step="1"
                    value={tempSettings.sensitivity}
                    onChange={(e) => handleChange('sensitivity', parseInt(e.target.value))}
                    className="w-full accent-brand-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-medium px-1">
                    <span>Low</span>
                    <span>High</span>
                </div>
             </div>

             {/* Daily Goal */}
             <div>
                <label className="flex justify-between text-sm font-bold text-slate-300 mb-2">
                    <span>Daily Step Goal</span>
                    <span className="text-brand-500 font-mono text-lg">{tempSettings.stepGoal.toLocaleString()}</span>
                </label>
                <div className="relative">
                    <input 
                        type="range" min="1000" max="50000" step="500"
                        value={tempSettings.stepGoal}
                        onChange={(e) => handleChange('stepGoal', parseInt(e.target.value))}
                        className="w-full accent-brand-500 h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer z-10 relative"
                    />
                </div>
             </div>
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-700 bg-slate-900 sticky bottom-0 z-20">
            <button 
                onClick={handleSave}
                className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 text-sm uppercase tracking-wider"
            >
                Save Preferences
            </button>
        </div>

      </div>
    </div>
  );
};