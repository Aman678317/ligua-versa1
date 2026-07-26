import React, { useState } from 'react';
import { Sliders, Volume2, Sparkles, Eye, Shield, Check, Save, Accessibility } from 'lucide-react';

export default function SettingsTab({ onSaveSettings }) {
  const [captionSize, setCaptionSize] = useState('medium'); // small, medium, large
  const [dualCaptionStyle, setDualCaptionStyle] = useState('stacked'); // stacked, side-by-side
  const [originalVoiceVolume, setOriginalVoiceVolume] = useState(30); // 30% ducking
  const [autoPlayTranslation, setAutoPlayTranslation] = useState(true);
  const [autoTranslateChat, setAutoTranslateChat] = useState(true);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [colorblindMode, setColorblindMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();

    if (highContrastMode) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }

    if (colorblindMode) {
      document.body.classList.add('colorblind-mode');
    } else {
      document.body.classList.remove('colorblind-mode');
    }

    onSaveSettings({
      captionSize,
      dualCaptionStyle,
      originalVoiceVolume: originalVoiceVolume / 100.0,
      autoPlayTranslation,
      autoTranslateChat,
      highContrastMode,
      colorblindMode
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title */}
      <div className="border-b border-white/10 pb-6">
        <span className="text-xs uppercase tracking-wider font-bold text-[#00E5C7] font-mono">
          User Preferences & In-Call Defaults
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Settings & Accessibility
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Caption Preferences */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00E5C7]" /> Dual Caption Customization
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Caption Font Size</label>
              <select
                value={captionSize}
                onChange={(e) => setCaptionSize(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00E5C7]"
              >
                <option value="small">Small (Standard 16px)</option>
                <option value="medium">Medium (Standard 18px)</option>
                <option value="large">Large (High Accessibility 24px)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Dual Caption Layout</label>
              <select
                value={dualCaptionStyle}
                onChange={(e) => setDualCaptionStyle(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00E5C7]"
              >
                <option value="stacked">Stacked (Original on top, Translated below)</option>
                <option value="side-by-side">Side-by-Side Comparison</option>
              </select>
            </div>
          </div>
        </div>

        {/* Accessibility & High Contrast Section */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-[#5B8CFF]" /> Accessibility Non-Negotiables
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
              <div>
                <p className="text-xs font-bold text-white">High Contrast Mode</p>
                <p className="text-[10px] text-slate-400">Pure dark backgrounds and high contrast text borders for maximum legibility</p>
              </div>
              <input
                type="checkbox"
                checked={highContrastMode}
                onChange={(e) => setHighContrastMode(e.target.checked)}
                className="w-4 h-4 rounded text-[#00E5C7] focus:ring-[#00E5C7] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
              <div>
                <p className="text-xs font-bold text-white">Colorblind Icon Redundancy</p>
                <p className="text-[10px] text-slate-400">Adds explicit shapes and text symbols to all status indicators</p>
              </div>
              <input
                type="checkbox"
                checked={colorblindMode}
                onChange={(e) => setColorblindMode(e.target.checked)}
                className="w-4 h-4 rounded text-[#00E5C7] focus:ring-[#00E5C7] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Audio Ducking & Voice Preferences */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-400" /> Audio Ducking & Voice Balance
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Original Spoken Volume During Translation:</span>
                <span className="text-[#00E5C7] font-mono">{originalVoiceVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={originalVoiceVolume}
                onChange={(e) => setOriginalVoiceVolume(Number(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#00E5C7]"
              />
              <p className="text-[11px] text-slate-500 mt-1">Lower values duck original speaker's voice so Piper TTS is clear.</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
              <div>
                <p className="text-xs font-bold text-white">Auto-Play Translated Voice</p>
                <p className="text-[10px] text-slate-400">Synthesize audio automatically when translation arrives</p>
              </div>
              <input
                type="checkbox"
                checked={autoPlayTranslation}
                onChange={(e) => setAutoPlayTranslation(e.target.checked)}
                className="w-4 h-4 rounded text-[#00E5C7] focus:ring-[#00E5C7] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences Saved!
            </span>
          )}

          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#5B8CFF] to-[#8B5CF6] hover:opacity-90 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>

      </form>

    </div>
  );
}
