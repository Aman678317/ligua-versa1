import React from 'react';
import { Sparkles, Zap, Volume2, Globe } from 'lucide-react';
export default function DualCaptionsOverlay({ currentCaption, targetLangCode, languages, userSettings }) {
  if (!currentCaption) return null;

  const targetLang = languages.find(l => l.code === targetLangCode) || { flag: '🌐', name: 'English' };
  const sourceLang = languages.find(l => l.code === currentCaption.sourceLang) || { flag: '🌐', name: 'Original' };

  // Accessibility Font Sizing per Design Brief
  const captionFontSizeClass = 
    userSettings?.captionSize === 'large' ? 'text-xl sm:text-2xl' :
    userSettings?.captionSize === 'small' ? 'text-sm sm:text-base' :
    'text-base sm:text-lg'; // Default >= 16px

  const metrics = currentCaption.metrics || { sttLatencyMs: 120, nmtLatencyMs: 150, ttsLatencyMs: 180, totalLatencyMs: 450 };

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-3xl pointer-events-none">
      <div
        key={currentCaption.id || currentCaption.timestamp}
        className="relative glass-hud bg-[#0A0E1A]/90 backdrop-blur-2xl border border-[#00E5C7]/30 rounded-2xl p-4 shadow-2xl shadow-cyan-950/50 pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300"
      >
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
            
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5C7] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E5C7]"></span>
              </span>
              <span className="text-xs font-bold text-[#F4F6FF] flex items-center gap-1.5">
                {sourceLang.flag} {currentCaption.speakerName}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                {currentCaption.sourceLang.toUpperCase()} → {targetLangCode.toUpperCase()}
              </span>
            </div>

            {/* Per-Stage Latency Breakdown Meter */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300 bg-[#00E5C7]/10 px-2.5 py-1 rounded-full border border-[#00E5C7]/30">
              <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
              <span>STT {metrics.sttLatencyMs}ms</span>
              <span className="text-slate-500">•</span>
              <span>NMT {metrics.nmtLatencyMs}ms</span>
              <span className="text-slate-500">•</span>
              <span>TTS {metrics.ttsLatencyMs}ms</span>
              <span className="text-slate-500">|</span>
              <span className="font-bold text-white">{metrics.totalLatencyMs}ms total</span>
            </div>
          </div>

          {/* Dual Text Block */}
          <div className="space-y-2">
            {/* Original Spoken Text (Speaker Confirmation) */}
            <div className="text-xs text-[#8A93AE] font-medium flex items-baseline gap-2 bg-slate-900/40 p-1.5 rounded-lg border border-white/5">
              <span className="text-[10px] uppercase font-mono text-slate-400 shrink-0 font-bold">Original ({currentCaption.sourceLang.toUpperCase()}):</span>
              <p className="italic text-slate-200">{currentCaption.originalText}</p>
            </div>

            {/* Translated Target Text */}
            <div className={`${captionFontSizeClass} font-bold text-white flex items-center justify-between gap-3 bg-gradient-to-r from-[#00E5C7]/15 via-[#5B8CFF]/15 to-transparent p-3 rounded-xl border border-[#00E5C7]/30 shadow-inner`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00E5C7] shrink-0 animate-spin-slow" />
                <p className="tracking-wide">{currentCaption.translatedText}</p>
              </div>

              {/* Audio synth wave indicator */}
              <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-indigo-500/25 text-indigo-200 text-xs font-semibold border border-indigo-500/30">
                <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="hidden sm:inline">Voice Dubbing</span>
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  <div className="w-0.5 bg-indigo-400 h-2 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-0.5 bg-indigo-400 h-3 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-0.5 bg-indigo-400 h-1.5 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
