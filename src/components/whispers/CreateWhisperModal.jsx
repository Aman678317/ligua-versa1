import React, { useState } from 'react';
import { X, RefreshCw, Send } from 'lucide-react';

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1483728642387-6c3ba6c6ce8f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&auto=format&fit=crop&q=80'
];

export default function CreateWhisperModal({ isOpen, onClose, onCreated }) {
  const [text, setText] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentBg = BACKGROUND_IMAGES[bgIndex];

  const handleShuffleBg = () => {
    setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/whispers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, bgImageUrl: currentBg })
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.whisper);
        setText('');
        onClose();
      }
    } catch (e) {
      console.error('Failed to create whisper:', e);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0B0F19] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Share a Confession</h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* Live Preview Card */}
          <div className="relative aspect-[3/4] w-full max-w-[280px] mx-auto rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
            <div className="absolute inset-0 bg-slate-900/40 z-0"></div>
            <img 
              src={currentBg} 
              alt="Preview Background" 
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] contrast-125 saturate-50 transition-all duration-500"
            />
            <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
              <h3 
                className="text-white text-xl md:text-2xl font-black text-center leading-tight drop-shadow-2xl font-serif break-words w-full"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8)' }}
              >
                {text || "Your confession will appear here..."}
              </h3>
            </div>
            
            <button 
              onClick={handleShuffleBg}
              className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/80 rounded-full backdrop-blur-md text-white transition-all z-20"
              title="Change Background"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Text Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">Your Secret</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 150))}
              placeholder="I have a confession to make..."
              className="w-full bg-[#0A0E1A] border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-28"
            />
            <div className="text-right text-xs text-slate-500 font-mono">
              {text.length}/150
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Share Anonymously</span>
          </button>
        </div>
      </div>
    </div>
  );
}
