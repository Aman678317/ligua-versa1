import React, { useState } from 'react';
import { 
  Video, Calendar, Clock, Plus, Users, ArrowRight, ShieldCheck, 
  Sparkles, PhoneCall, Copy, Check, Globe, FileText, Bell
} from 'lucide-react';
import HoloEarth from '../canvas/HoloEarth';

export default function DashboardLayout({ 
  currentUser, 
  onStartInstantCall, 
  onJoinCall, 
  onOpenSchedule,
  meetings, 
  contacts, 
  onSelectSummary 
}) {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCodeInput.trim()) {
      onJoinCall(joinCodeInput.trim());
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Welcome Hero Banner with 3D Holographic Earth */}
      <div className="relative rounded-3xl overflow-hidden p-8 md:p-10 bg-gradient-to-r from-[#05060B] via-[#0A0E1A] to-[#05060B] border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left Content */}
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5C7]/10 border border-[#00E5C7]/30 text-[#00E5C7] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Real-time Multilingual HUD Engine Active
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F4F6FF] tracking-tight leading-tight">
            Speak your language.<br />
            <span className="bg-gradient-to-r from-[#5B8CFF] via-[#8B5CF6] to-[#00E5C7] bg-clip-text text-transparent">
              Be understood everywhere.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300">
            Live speech-to-speech translation, dual captions, and AI meeting summaries — built directly into WebRTC video calls.
          </p>

          {/* Call Actions */}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            
            <button
              onClick={onStartInstantCall}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#5B8CFF] via-[#8B5CF6] to-[#00E5C7] hover:opacity-90 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02]"
            >
              <Video className="w-5 h-5" />
              Start Instant Call
            </button>

            <form onSubmit={handleJoin} className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-white/15">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="Enter meeting code..."
                className="bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none w-36 sm:w-48"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all"
              >
                Join
              </button>
            </form>

            <button
              onClick={onOpenSchedule}
              className="px-5 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 font-semibold text-sm flex items-center gap-2 transition-all"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              Schedule Call
            </button>

          </div>
        </div>

        {/* Right 3D Holographic Earth Globe Canvas */}
        <div className="w-full md:w-80 h-72 relative shrink-0">
          <HoloEarth />
        </div>

      </div>

      {/* Main Grid: Scheduled Calls + Quick Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Scheduled Meetings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" /> Scheduled Meetings & Live Sessions
            </h2>
            <span className="text-xs text-slate-400 font-mono">{meetings.length} Total</span>
          </div>

          <div className="space-y-4">
            {meetings.map((m) => (
              <div 
                key={m.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 transition-all shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      m.status === 'LIVE' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {m.status === 'LIVE' ? '🔴 Live Now' : 'Scheduled'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{m.code}</span>
                  </div>

                  <h3 className="font-bold text-white text-base">{m.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{m.description}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleCopy(m.code)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors"
                    title="Copy Invite Link"
                  >
                    {copiedCode === m.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => onJoinCall(m.code)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <PhoneCall className="w-4 h-4" />
                    {m.status === 'LIVE' ? 'Join Live Room' : 'Start Call'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Multilingual Team Directory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Multilingual Contacts
            </h2>
          </div>

          <div className="bg-slate-900/80 rounded-2xl border border-white/10 p-4 space-y-3 shadow-lg">
            {contacts.map((c) => (
              <div 
                key={c.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src={c.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30" alt="" />
                  <div>
                    <p className="text-xs font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Globe className="w-3 h-3 text-cyan-400" /> Default: {c.defaultLang.toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onJoinCall(`direct-${c.id}`)}
                  className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs transition-colors"
                  title="Call Contact"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
