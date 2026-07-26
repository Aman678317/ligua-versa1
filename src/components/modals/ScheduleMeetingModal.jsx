import React, { useState } from 'react';
import { Calendar, Clock, Globe, Sparkles, X } from 'lucide-react';

export default function ScheduleMeetingModal({ isOpen, onClose, onMeetingCreated, languages }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [spokenLang, setSpokenLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ja');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const meetingCode = `lingua-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;

    const newMeeting = {
      id: `meeting-${Date.now()}`,
      code: meetingCode,
      title: title || 'Multilingual Strategy Session',
      description: description || 'Live translated WebRTC video call',
      scheduledStart: scheduledStart || new Date().toISOString(),
      status: 'SCHEDULED',
      spokenLang,
      targetLang
    };

    onMeetingCreated(newMeeting);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#131B2E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Schedule Multilingual Meeting
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Meeting Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cross-Border Product Sync"
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Description & Agenda</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda details..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 h-20"
            />
          </div>

          {/* Languages Setup */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/80 rounded-2xl border border-white/5">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Your Spoken Language</label>
              <select
                value={spokenLang}
                onChange={(e) => setSpokenLang(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                {languages.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Default Target Language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                {languages.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20"
            >
              Save & Create Invite
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
