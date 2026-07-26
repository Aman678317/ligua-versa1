import React, { useState, useRef, useEffect } from 'react';
import { Video, Link as LinkIcon, Calendar, ChevronDown, Plus } from 'lucide-react';

export default function NewMeetingDropdown({ onStartInstantCall, onCreateForLater, onOpenSchedule }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#00E5C7] to-cyan-500 hover:from-cyan-400 hover:to-[#00E5C7] text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>New meeting</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#0A0E1A]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
          <button
            onClick={() => {
              setIsOpen(false);
              onStartInstantCall();
            }}
            className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-100 hover:text-white flex items-center gap-3 transition-colors text-xs font-semibold group"
          >
            <div className="p-2 rounded-lg bg-cyan-500/10 text-[#00E5C7] group-hover:bg-[#00E5C7] group-hover:text-slate-950 transition-colors">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Start an instant meeting</p>
              <p className="text-[10px] text-slate-400">Join call immediately</p>
            </div>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onCreateForLater();
            }}
            className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-100 hover:text-white flex items-center gap-3 transition-colors text-xs font-semibold group"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Create a meeting for later</p>
              <p className="text-[10px] text-slate-400">Get link to share with others</p>
            </div>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onOpenSchedule();
            }}
            className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-100 hover:text-white flex items-center gap-3 transition-colors text-xs font-semibold group"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Schedule in Calendar</p>
              <p className="text-[10px] text-slate-400">Plan ahead with invite settings</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
