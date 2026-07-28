import React, { useState } from 'react';
import { Mic, Shield, X } from 'lucide-react';

export default function VoiceConsentModal({ isOpen, onAccept, onDecline }) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0A0E1A] border border-[#00E5C7]/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-[#00E5C7]/20 relative">
        <button onClick={onDecline} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#00E5C7]/20 flex items-center justify-center text-[#00E5C7]">
            <Mic className="w-6 h-6" />
          </div>
          
          <h2 className="text-xl font-bold text-white">Enable Voice Cloning?</h2>
          
          <p className="text-sm text-slate-300 leading-relaxed">
            Allow LinguaVersa to use a short voice sample to make your translated voice sound like you? 
          </p>

          <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-left">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Your sample is used only for this session and is <strong className="text-white">never stored</strong> on our servers after the call ends.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3 pt-4">
            <button 
              onClick={onAccept}
              className="w-full py-3 bg-[#00E5C7] hover:bg-[#00E5C7]/80 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(0,229,199,0.4)]"
            >
              Allow & Enable Voice Cloning
            </button>
            <button 
              onClick={onDecline}
              className="w-full py-3 bg-transparent hover:bg-white/5 border border-white/20 text-white font-medium rounded-xl transition-all"
            >
              Use standard voice instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
