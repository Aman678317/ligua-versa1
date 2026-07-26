import React, { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function AIStatusIndicator() {
  const [aiStatus, setAiStatus] = useState('OPERATIONAL'); // 'OPERATIONAL' | 'DEGRADED'

  const toggleStatus = () => {
    setAiStatus(prev => prev === 'OPERATIONAL' ? 'DEGRADED' : 'OPERATIONAL');
  };

  return (
    <div 
      onClick={toggleStatus}
      className={`cursor-pointer px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
        aiStatus === 'OPERATIONAL'
          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
      }`}
      title="Click to simulate AI Service health toggle"
    >
      {aiStatus === 'OPERATIONAL' ? (
        <>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Engine: Live (P75 &lt; 2.5s)</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          <span>AI Service Degraded (Audio-only call fallback)</span>
        </>
      )}
    </div>
  );
}
