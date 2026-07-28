import React from 'react';
export function ChatBotOrb({ isProcessing = true }) {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      {/* Outer Glowing Ripple Rings */}
      {isProcessing && (
        <>
          <div
            style={{ animation: 'rippleCore 2s ease-in-out infinite' }}
            className="absolute inset-0 rounded-full border border-cyan-400/60"
          />
          <div
            style={{ animation: 'rippleOuter 2s ease-in-out infinite 0.5s' }}
            className="absolute inset-0 rounded-full border border-violet-500/40"
          />
        </>
      )}

      {/* Core Orb Center */}
      <div className="relative z-10 w-7 h-7 rounded-full bg-gradient-to-tr from-[#5B8CFF] via-[#8B5CF6] to-[#00E5C7] shadow-lg shadow-cyan-500/30 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-md" />
      </div>
    </div>
  );
}

export function AIBrainCore({ isTranslating = true }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* 3D Pulsing Energy Core */}
      <div
        style={{ animation: 'spin-linear 15s linear infinite' }}
        className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/40"
      />
      <div
        style={{ animation: 'spin-reverse-linear 20s linear infinite' }}
        className="absolute inset-2 rounded-full border border-dashed border-violet-500/50"
      />
      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 shadow-2xl shadow-cyan-500/50 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-white animate-ping opacity-80" />
      </div>
    </div>
  );
}
