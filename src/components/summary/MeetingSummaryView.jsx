import React, { useState } from 'react';
import { BookOpen, CheckSquare, Square, Search, Volume2, Globe, Clock, Sparkles, Download, Share2 } from 'lucide-react';

export default function MeetingSummaryView({ summaries }) {
  const [selectedSummary, setSelectedSummary] = useState(summaries[0] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionItems, setActionItems] = useState(selectedSummary ? selectedSummary.actionItems : []);

  if (!selectedSummary) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 space-y-3">
        <BookOpen className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
        <h3 className="text-xl font-bold text-white">No AI Summaries Found</h3>
        <p className="text-sm">Complete a call to automatically generate searchable dual-language summaries and action items.</p>
      </div>
    );
  }

  const toggleActionItem = (id) => {
    setActionItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const filteredTranscript = selectedSummary.transcriptSample?.filter(t => 
    t.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.translated.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-cyan-400 font-mono">
            AI Automated Post-Call Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Meeting Summaries & Dual Transcripts
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 flex items-center gap-2 transition-all">
            <Download className="w-4 h-4 text-cyan-400" /> Export PDF
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all">
            <Share2 className="w-4 h-4" /> Share Summary
          </button>
        </div>
      </div>

      {/* Summary Selection Chips */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {summaries.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSelectedSummary(s);
              setActionItems(s.actionItems);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
              selectedSummary.id === s.id
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white border-cyan-400/50 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {s.meetingTitle}
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Overview, Key Points, Action Items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Overview Box */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Executive Overview
              </h3>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {selectedSummary.durationMin} Minutes
              </span>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">
              {selectedSummary.overview}
            </p>

            {/* Languages Badge Row */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-400">Spoken Languages:</span>
              {selectedSummary.languagesUsed?.map((lang) => (
                <span key={lang} className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono">
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* Key Bullet Points */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Key Discussion Highlights
            </h3>

            <ul className="space-y-3">
              {selectedSummary.keyPoints?.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0"></span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Items Checklist */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" /> Action Items & Tasks
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {actionItems.filter(a => a.done).length} / {actionItems.length} Completed
              </span>
            </div>

            <div className="space-y-2">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleActionItem(item.id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    item.done
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400 line-through'
                      : 'bg-slate-950/60 border-white/5 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.done ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium">{item.text}</span>
                  </div>

                  <span className="text-[10px] bg-slate-800 px-2 py-1 rounded-lg text-indigo-300 font-bold shrink-0">
                    Assignee: {item.assignee}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Searchable Dual-Language Transcript */}
        <div className="space-y-4">
          
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4 flex flex-col h-[600px]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Search Transcript
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spoken words or translations..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Transcript Scroll Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredTranscript.map((t) => (
                <div key={t.id} className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-bold text-white">{t.speaker}</span>
                    <span className="text-[10px] font-mono">{t.time}</span>
                  </div>

                  <p className="text-slate-400 italic">Original ({t.sourceLang}): "{t.original}"</p>
                  
                  <p className="text-cyan-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                    Translated ({t.targetLang}): "{t.translated}"
                  </p>

                  <button className="mt-1 text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Play Audio
                  </button>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
