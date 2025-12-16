import React from 'react';
import { ApnaWalkLogo } from './ApnaWalkLogo';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans selection:bg-brand-500/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-dark-card/90 backdrop-blur border-b border-dark-border py-4 px-6 flex justify-between items-center">
         <div className="flex items-center gap-2">
             <ApnaWalkLogo size={24} showText={false} />
             <span className="font-bold text-lg tracking-tight">Apna<span className="text-brand-500">Walk</span></span>
         </div>
         <a href="/" className="text-sm font-medium text-slate-400 hover:text-brand-500 transition-colors">
            <i className="fa-solid fa-arrow-left mr-2"></i> Back to App
         </a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-4">Privacy Policy</h1>
        <p className="text-slate-400 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
            
            <section>
                <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
                <p>
                    Welcome to <strong>ApnaWalk</strong> ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. 
                    This Privacy Policy explains how we collect, use, and safeguard your information when you use our fitness tracking application.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
                <p className="mb-3">We adhere to a <strong>"Local First"</strong> architecture. This means the majority of your fitness data resides solely on your device.</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-brand-500">
                    <li><strong>Personal Identification:</strong> When you login via Google (powered by Supabase), we store your Name, Email, and Avatar URL to identify your session.</li>
                    <li><strong>Fitness Data:</strong> Step counts, walking distance, calories burned, and activity history are stored in your browser's LocalStorage.</li>
                    <li><strong>Location Data:</strong> We access your GPS coordinates <em>only</em> when you grant permission. This is used to calculate distance, map your route, and fetch local weather.</li>
                    <li><strong>Device Sensors:</strong> We access your device's accelerometer/motion sensors to count steps locally.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
                <ul className="list-disc pl-5 space-y-2 marker:text-brand-500">
                    <li>To provide accurate fitness tracking and route visualization.</li>
                    <li>To generate personalized insights and motivation via our AI Coach.</li>
                    <li>To send local reminders (water, walking) based on your settings.</li>
                    <li>To display local weather and air quality information.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">4. AI & Third-Party Services</h2>
                <p className="mb-3">We utilize third-party services to enhance functionality. We only share the minimum necessary data required to perform the specific task:</p>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4">
                    <div>
                        <h3 className="font-bold text-white">Google Gemini AI</h3>
                        <p className="text-sm text-slate-400">Used for generating workout summaries, badges, and motivational chat. Data sent (e.g., step count, weather) is stateless and not used by Google to train their models.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Supabase</h3>
                        <p className="text-sm text-slate-400">Used for secure authentication. Your login credentials are managed securely by Supabase.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Open-Meteo</h3>
                        <p className="text-sm text-slate-400">Your latitude/longitude is sent anonymously to fetch weather data.</p>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">5. Data Security & Storage</h2>
                <p>
                    Your fitness history is stored locally on your device (LocalStorage). If you clear your browser cache or uninstall the app (PWA), this local data may be lost. 
                    We do not maintain a central database of your daily walking history.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">6. Children's Privacy</h2>
                <p>
                    ApnaWalk does not knowingly collect data from children under the age of 13. If you become aware that a child has provided us with personal information, please contact us.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">7. Contact Us</h2>
                <p>
                    If you have questions about this Privacy Policy, please contact us at: <br/>
                    <a href="mailto:support@apnawalk.com" className="text-brand-500 hover:underline">support@apnawalk.com</a>
                </p>
            </section>

        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
            <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} ApnaWalk. Built by Sparq IT Service.</p>
        </div>
      </div>
    </div>
  );
};