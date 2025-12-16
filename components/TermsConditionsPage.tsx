import React from 'react';
import { ApnaWalkLogo } from './ApnaWalkLogo';

export const TermsConditionsPage: React.FC = () => {
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
        <h1 className="text-3xl md:text-4xl font-black text-white mb-4">Terms & Conditions</h1>
        <p className="text-slate-400 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
            
            <section>
                <h2 className="text-xl font-bold text-white mb-3">1. Agreement to Terms</h2>
                <p>
                    By accessing or using <strong>ApnaWalk</strong>, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the service.
                </p>
            </section>

            <section className="bg-red-500/10 border-l-4 border-red-500 p-6 rounded-r-xl">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-red-500"></i> 2. Health & Medical Disclaimer
                </h2>
                <p className="text-red-100 font-medium">
                    ApnaWalk is NOT a medical device.
                </p>
                <p className="mt-2 text-red-200/80 text-sm">
                    The content provided by this app, including AI Coach insights, hydration tips, and step analysis, is for informational and motivational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician before starting any new fitness program.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">3. Accuracy of Data</h2>
                <p>
                    While we strive for accuracy, the step count, distance, and calorie burn calculations are estimates based on your device's sensors and GPS. We do not guarantee 100% accuracy of these metrics. Factors such as device hardware, signal strength, and carrying position can affect data quality.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">4. User Accounts & Security</h2>
                <p>
                    You are responsible for safeguarding the password (Google Account) you use to access the service. We encourage you to use "strong" passwords with your account. ApnaWalk is not liable for any loss or damage arising from your failure to comply with this.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">5. Intellectual Property</h2>
                <p>
                    The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of ApnaWalk and its licensors. The Service is protected by copyright, trademark, and other laws of India and foreign countries.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">6. Acceptable Use</h2>
                <p className="mb-2">You agree not to:</p>
                <ul className="list-disc pl-5 space-y-1 marker:text-brand-500">
                    <li>Use the service for any illegal purpose.</li>
                    <li>Attempt to reverse engineer the application.</li>
                    <li>Use the app in a way that distracts you from traffic or safety regulations while walking outdoors.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">7. Limitation of Liability</h2>
                <p>
                    In no event shall ApnaWalk, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of data, use, goodwill, or other intangible losses.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-3">8. Changes</h2>
                <p>
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
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