import React from 'react';
import { CameraOff, MicOff, Lock, AlertCircle, RefreshCw, Sliders } from 'lucide-react';

export default function PermissionBanner({ errorType, onRetry }) {
  if (!errorType) return null;

  const isDenied = errorType === 'NotAllowedError' || errorType === 'PermissionDenied';
  const isNotFound = errorType === 'NotFoundError' || errorType === 'DevicesNotFound';
  const isReadableError = errorType === 'NotReadableError' || errorType === 'HardwareInUse';

  return (
    <div className="mx-4 sm:mx-6 mt-16 z-30 p-5 bg-[#0A0E1A]/95 border border-rose-500/40 rounded-2xl backdrop-blur-xl shadow-2xl space-y-4">
      
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
          {isNotFound ? <AlertCircle className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
        </div>

        <div className="space-y-1 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            {isDenied && '🔒 Camera & Microphone Permission Blocked'}
            {isNotFound && '📷 Hardware Device Not Found'}
            {isReadableError && '⚠️ Camera/Microphone In Use By Another App'}
            {!isDenied && !isNotFound && !isReadableError && '⚠️ Media Device Access Issue'}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed">
            {isDenied && (
              <>
                Your browser is blocking camera or microphone access for LinguaVersa.
              </>
            )}
            {isNotFound && (
              <>
                No camera or microphone hardware was detected. Please connect your webcam or headset and click Retry.
              </>
            )}
            {isReadableError && (
              <>
                Your camera or microphone is currently locked by another application (e.g. Zoom, Teams, or OBS). Please close that app and retry.
              </>
            )}
          </p>

          {/* Address Bar Step-by-Step Instructions for Denied Permissions */}
          {isDenied && (
            <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-cyan-300">
                <Lock className="w-4 h-4 text-cyan-400" /> How to allow permissions in your browser:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-300">
                <li>Click the <strong>Lock / Camera icon</strong> in your browser's top address bar (left of the URL).</li>
                <li>Change <strong>Camera</strong> and <strong>Microphone</strong> permissions to <strong className="text-emerald-400">Allow</strong>.</li>
                <li>Click the <strong>"Retry Permission"</strong> button below.</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Permission
        </button>
      </div>

    </div>
  );
}
