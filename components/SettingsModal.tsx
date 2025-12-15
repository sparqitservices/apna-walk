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
  
  const handleNotificationToggle = async (key: 'water' | 'walk' | 'breath') => {
      const current = tempSettings.notifications?.[key] ?? false;
      if (!current) {
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
              [key]: !current
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-md rounded-3xl overflow-hidden border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-white font-bold text-lg">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* User Info */}
          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden border-2 border-slate-600 group-hover:border-brand-500 transition-colors ${tempProfile.isGuest ? 'bg-slate-600' : 'bg-brand-500'}`}>
                    {tempProfile.avatar ? (
                        <img src={tempProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        getInitials(tempProfile.name)
                    )}
                </div>
                {tempProfile.avatar && (
                    <button onClick={handleRemoveAvatar} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-slate-800 z-10">
                        <i className="fa-solid fa-xmark text-[10px] text-white"></i>
                    </button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg truncate">{tempProfile.name || 'Guest User'}</h3>
                <p className="text-slate-400 text-xs truncate">{tempProfile.email || 'Guest Mode'}</p>
            </div>
          </div>
          
          <div className="flex justify-end -mt-2">
            {profile.isGuest ? (
                <button onClick={onLoginRequest} className="text-brand-400 text-xs font-bold px-2 py-1">Log In</button>
            ) : (
                <button onClick={onLogout} className="text-red-400 text-xs px-2 py-1">Sign Out</button>
            )}
          </div>
          
           {/* Notifications */}
           <div>
               <h3 className="text-brand-400 text-xs font-bold uppercase tracking-wider mb-3">Notifications</h3>
               <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                   {[
                       { id: 'water', label: 'Hydration Reminders', icon: 'fa-glass-water' },
                       { id: 'walk', label: 'Movement Reminders', icon: 'fa-person-walking' },
                       { id: 'breath', label: 'Breathing Exercises', icon: 'fa-lungs' }
                   ].map(n => (
                       <div key={n.id} className="flex justify-between items-center">
                           <div className="flex items-center gap-2 text-sm text-slate-300">
                               <i className={`fa-solid ${n.icon} w-5 text-center`}></i> {n.label}
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={!!tempSettings.notifications?.[n.id as keyof typeof tempSettings.notifications]}
                                    onChange={() => handleNotificationToggle(n.id as any)}
                                />
                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                           </label>
                       </div>
                   ))}
               </div>
           </div>

          {/* Location */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                      <i className="fa-solid fa-location-crosshairs text-brand-400"></i>
                      <span className="text-sm font-bold text-white">Location Services</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={tempSettings.enableLocation}
                        onChange={(e) => handleChange('enableLocation', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
              </div>
          </div>

          {/* Theme */}
          <div>
            <h3 className="text-brand-400 text-xs font-bold uppercase tracking-wider mb-3">App Theme</h3>
            <div className="grid grid-cols-5 gap-2">
                {themes.map((theme) => (
                    <button 
                        key={theme.id}
                        onClick={() => handleChange('theme', theme.id)}
                        className={`flex flex-col items-center gap-1 group`}
                    >
                        <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${tempSettings.theme === theme.id ? 'border-white scale-110' : 'border-transparent opacity-70 group-hover:opacity-100'}`}
                            style={{ backgroundColor: theme.color }}
                        >
                            {tempSettings.theme === theme.id && <i className="fa-solid fa-check text-white text-xs"></i>}
                        </div>
                    </button>
                ))}
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-700/50">
             <h3 className="text-brand-400 text-xs font-bold uppercase tracking-wider">Accuracy & Goal</h3>
             
             {/* Calibration */}
             <div>
                <label className="flex justify-between text-sm text-slate-300 mb-2">
                    <span>Sensitivity</span>
                    <span className="text-brand-500 font-mono">{tempSettings.sensitivity}</span>
                </label>
                <div className="bg-slate-800 rounded-lg p-3 mb-3 border border-slate-700">
                    {calibrationState === 'idle' && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Not accurate?</span>
                            <button onClick={handleCalibrate} className="text-xs bg-brand-600 px-3 py-1.5 rounded-md text-white hover:bg-brand-500">Auto-Calibrate</button>
                        </div>
                    )}
                    {calibrationState === 'walking' && (
                        <div className="flex flex-col items-center py-2">
                            <span className="text-sm text-white font-bold animate-pulse">Walk normally for 5s...</span>
                        </div>
                    )}
                    {calibrationState === 'done' && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-green-400">Set to {calibratedValue}</span>
                            <button onClick={() => setCalibrationState('idle')} className="text-xs text-slate-500">Dismiss</button>
                        </div>
                    )}
                </div>
             </div>

             {/* Goal */}
             <div>
                <label className="flex justify-between text-sm text-slate-300 mb-2">
                    <span>Daily Goal</span>
                    <span className="text-brand-500 font-mono">{tempSettings.stepGoal.toLocaleString()}</span>
                </label>
                <input 
                    type="range" min="1000" max="50000" step="1000"
                    value={tempSettings.stepGoal}
                    onChange={(e) => handleChange('stepGoal', parseInt(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
             </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-colors shadow-lg"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
