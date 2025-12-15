import React from 'react';

export type DocType = 'privacy' | 'terms' | null;

interface LegalModalProps {
  isOpen: boolean;
  type: DocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, type, onClose }) => {
  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-2xl rounded-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[85vh] animate-message-pop">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            {type === 'privacy' ? <i className="fa-solid fa-user-shield text-brand-500"></i> : <i className="fa-solid fa-file-contract text-brand-500"></i>}
            {type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-slate-300 text-sm leading-relaxed space-y-6 scroll-smooth">
            {type === 'privacy' ? (
                <>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Effective Date: {new Date().toLocaleDateString()}</p>
                        <p>Welcome to ApnaWalk. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data.</p>
                    </div>
                    
                    <div>
                        <h3 className="text-white font-bold text-lg mb-2">1. Data We Collect</h3>
                        <p>We adhere to a "Local First" policy. Most of your data resides solely on your device.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                            <li><strong>Identity Data:</strong> Name and email address (stored locally).</li>
                            <li><strong>Health Data:</strong> Steps, distance, calories, height, weight, and hydration logs.</li>
                            <li><strong>Location Data:</strong> GPS coordinates for route mapping and local weather fetching.</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 className="text-white font-bold text-lg mb-2">2. How We Use Data</h3>
                        <p>We use your data to:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                            <li>Track your fitness progress.</li>
                            <li>Provide AI-powered coaching insights via Google Gemini API (data is transient and not stored by the AI provider for training).</li>
                            <li>Send hydration and movement reminders.</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-bold text-lg mb-2">3. Third-Party Services</h3>
                        <p>We use <strong>Google Gemini API</strong> for generating insights and badges. We send only necessary session context (steps, time, weather) to generate these responses.</p>
                    </div>
                    
                    <div>
                        <h3 className="text-white font-bold text-lg mb-2">4. Your Rights</h3>
                        <p>Since your data is stored in your browser's LocalStorage, you have full control. You can clear your app data at any time via your browser settings or the app's "Reset" functions.</p>
                    </div>
                </>
            ) : (
                <>
                     <div>
                         <p className="text-xs text-slate-500 uppercase font-bold mb-1">Last Updated: {new Date().toLocaleDateString()}</p>
                         <p>By downloading or using the ApnaWalk app, these terms will automatically apply to you.</p>
                     </div>

                     <div>
                         <h3 className="text-white font-bold text-lg mb-2">1. Health Disclaimer</h3>
                         <div className="bg-red-500/10 border-l-4 border-red-500 p-3 rounded-r-lg">
                             <p className="text-red-200"><strong>ApnaWalk is not a medical device.</strong> The AI Coach insights, hydration tips, and activity tracking are for informational and motivational purposes only. Always consult a doctor before starting any new fitness regime.</p>
                         </div>
                     </div>

                     <div>
                         <h3 className="text-white font-bold text-lg mb-2">2. Use of Service</h3>
                         <p>You must not misuse our services. You are responsible for keeping your device and access to the app secure. We are not liable for any data loss due to device failure or clearing of browser cache.</p>
                     </div>

                     <div>
                         <h3 className="text-white font-bold text-lg mb-2">3. Safety</h3>
                         <p>When using the app outdoors (e.g., walking, GPS tracking), please pay attention to your surroundings. Do not interact with the app in a way that distracts you from traffic or safety hazards.</p>
                     </div>
                     
                     <div>
                         <h3 className="text-white font-bold text-lg mb-2">4. Changes to Terms</h3>
                         <p>We may update our Terms and Conditions from time to time. Thus, you are advised to review this page periodically for any changes.</p>
                     </div>
                </>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/30 flex justify-center">
            <button onClick={onClose} className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-10 rounded-full transition-colors shadow-lg active:scale-95">
                I Understand
            </button>
        </div>
      </div>
    </div>
  );
};