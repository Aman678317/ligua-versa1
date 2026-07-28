import React, { useState } from 'react';
import { 
  Video, Keyboard, ArrowRight, ShieldCheck, Sparkles, Globe2, 
  Users, Clock, Play, FileText, ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import HoloEarth from '../canvas/HoloEarth';
import NewMeetingDropdown from '../landing/NewMeetingDropdown';

export default function DashboardLayout({ 
  currentUser, 
  onStartInstantCall, 
  onJoinCall, 
  onOpenSchedule, 
  onCreateForLater, 
  meetings, 
  contacts, 
  onSelectSummary 
}) {
  const [inputCodeOrLink, setInputCodeOrLink] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Helper parsing bare code or full URL e.g. https://domain.com/meet/lingua-382-991 -> lingua-382-991
  const parseMeetingCode = (raw) => {
    let clean = raw.trim();
    if (clean.includes('/meet/')) {
      clean = clean.split('/meet/')[1];
    }
    if (clean.includes('?')) {
      clean = clean.split('?')[0];
    }
    return clean;
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    const code = parseMeetingCode(inputCodeOrLink);

    if (!code) {
      setValidationError('Please enter a valid meeting code or link.');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const res = await fetch(`/api/meetings/${code}`);
      const data = await res.json();

      if (data && data.success && data.meeting) {
        onJoinCall(code);
      } else {
        setValidationError('Meeting not found. Please check the code and try again.');
      }
    } catch (err) {
      // Fallback allowed for dynamic rooms
      onJoinCall(code);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-[#00E5C7] selection:text-slate-950">
      
      {/* Google Meet-Style Clean Landing Hero */}
      <section className="relative w-full py-12 lg:py-20 px-4 sm:px-8 max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        
        {/* Ambient Holographic Background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
          <HoloEarth />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column: Two Primary Actions (Meet Layout) */}
          <div className="lg:col-span-7 space-y-8">
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#00E5C7] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Video Calls with Live Speech Translation</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Video calls and meetings <br />
                <span className="bg-gradient-to-r from-[#00E5C7] via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  translated live for everyone
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Connect, collaborate, and speak your native language. LinguaVersa translates speech in real time with sub-second dual captions and natural voice synthesis.
              </p>
            </div>

            {/* Meet-Style Side-by-Side Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-2xl">
              
              {/* Action 1: New Meeting Dropdown */}
              <NewMeetingDropdown
                onStartInstantCall={onStartInstantCall}
                onCreateForLater={onCreateForLater}
                onOpenSchedule={onOpenSchedule}
              />

              {/* Action 2: Enter Code or Link Input */}
              <form onSubmit={handleJoinSubmit} className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Keyboard className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={inputCodeOrLink}
                    onChange={(e) => {
                      setInputCodeOrLink(e.target.value);
                      setValidationError('');
                    }}
                    placeholder="Enter a code or link"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5C7]/60 shadow-inner transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputCodeOrLink.trim() || isValidating}
                  className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all"
                >
                  {isValidating ? 'Validating...' : 'Join'}
                </button>
              </form>

            </div>

            {/* Inline Validation Error Message */}
            {validationError && (
              <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl max-w-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="pt-4 border-t border-white/10 flex items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> End-to-End WebRTC Security</span>
              <span className="flex items-center gap-1.5"><Globe2 className="w-4 h-4 text-cyan-400" /> 100+ Languages Supported</span>
            </div>

          </div>


        </div>

      </section>

      {/* Recent Scheduled Calls & AI Summaries Section */}
      <section className="border-t border-white/10 bg-[#0A0E1A]/40 py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Scheduled Calls List */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00E5C7]" /> Scheduled Meetings
            </h3>

            <div className="space-y-2">
              {meetings.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between hover:border-white/20 transition-all">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">{m.title}</h4>
                    <p className="text-[11px] font-mono text-cyan-400">{m.code}</p>
                  </div>
                  <button
                    onClick={() => onJoinCall(m.code)}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-[#00E5C7] text-[#00E5C7] hover:text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    <span>Join</span> <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Call Summaries Quick Access */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Recent AI Meeting Summaries
            </h3>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold text-white">Cross-Border Product Architecture Sync</span>
                <span className="text-slate-500">Yesterday</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">
                The team finalized the WebRTC TURN relay deployment strategy for cross-network connectivity and agreed on lowering STT chunking intervals.
              </p>
              <button
                onClick={onSelectSummary}
                className="text-xs font-bold text-[#00E5C7] hover:underline flex items-center gap-1"
              >
                <span>View Full Summary & Action Items</span> <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
