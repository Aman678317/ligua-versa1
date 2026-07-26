import React, { useState } from 'react';
import { Check, Copy, Share2, MessageCircle, Video, X } from 'lucide-react';

export default function MeetingCreatedModal({ isOpen, onClose, meeting, onJoinCall }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !meeting) return null;

  const meetingUrl = `${window.location.origin}/meet/${meeting.code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Join my LinguaVersa live translated call: ${meeting.title}\nLink: ${meetingUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#131B2E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Check className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-white">Meeting Scheduled!</h3>
          <p className="text-xs text-slate-400">{meeting.title}</p>
        </div>

        {/* Meeting Code Banner */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/30 space-y-2">
          <span className="text-[10px] uppercase font-mono text-cyan-400 block">Meeting Code</span>
          <span className="text-2xl font-extrabold text-white tracking-wider font-mono">{meeting.code}</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          
          <button
            onClick={handleCopy}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Invite Link Copied!' : 'Copy Invite Link'}
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Share on WhatsApp
          </button>

          <button
            onClick={() => {
              onClose();
              onJoinCall(meeting.code);
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Video className="w-4 h-4" />
            Join Room Now
          </button>

        </div>

      </div>
    </div>
  );
}
