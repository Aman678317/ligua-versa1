import React from 'react';
import { Sparkles, Zap, Volume2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DualCaptionsOverlay({ currentCaption, targetLangCode, languages, userSettings }) {
  if (!currentCaption) return null;

  const targetLang = languages.find(l => l.code === targetLangCode) || { flag: '🌐', name: 'English' };
  const sourceLang = languages.find(l => l.code === currentCaption.sourceLang) || { flag: '🌐', name: 'Original' };

  // Accessibility Font Sizing per Design Brief
  const captionFontSizeClass = 
    userSettings?.captionSize === 'large' ? 'text-xl sm:text-2xl' :
    userSettings?.captionSize === 'small' ? 'text-sm sm:text-base' :
    'text-base sm:text-lg'; // Default >= 16px

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-3xl pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCaption.id || currentCaption.timestamp}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative glass-hud bg-[#0A0E1A]/90 backdrop-blur-2xl border border-[#00E5C7]/30 rounded-2xl p-4 shadow-2xl shadow-cyan-950/50 pointer-events-auto"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
            
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5C7] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E5C7]"></span>
              </span>
              <span className="text-xs font-bold text-[#F4F6FF] flex items-center gap-1.5">
                {sourceLang.flag} {currentCaption.speakerName}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                {currentCaption.sourceLang.toUpperCase()} → {targetLangCode.toUpperCase()}
              </span>
            </div>

            {/* Latency Meter Tag */}
            {currentCaption.metrics && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00E5C7]/10 border border-[#00E5C7]/30 text-[11px] font-mono text-[#00E5C7]">
                <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span>{currentCaption.metrics.totalLatencyMs}ms (P75 &lt; 2.5s)</span>
              </div>
            )}
          </div>

          {/* Dual Text Block */}
          <div className="space-y-1.5">
            {/* Original Spoken Text */}
            <div className="text-xs text-[#8A93AE] font-medium flex items-baseline gap-2">
              <span className="text-[10px] uppercase font-mono text-slate-500 shrink-0">Original ({currentCaption.sourceLang}):</span>
              <p className="italic">{currentCaption.originalText}</p>
            </div>

            {/* Translated Target Text */}
            <div className={`${captionFontSizeClass} font-bold text-white flex items-center justify-between gap-3 bg-gradient-to-r from-[#00E5C7]/10 via-[#5B8CFF]/10 to-transparent p-2.5 rounded-xl border border-[#00E5C7]/20`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00E5C7] shrink-0 animate-spin-slow" />
                <p className="tracking-wide">{currentCaption.translatedText}</p>
              </div>

              {/* Audio synth wave indicator */}
              <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="hidden sm:inline">Piper TTS</span>
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
              </div>
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
