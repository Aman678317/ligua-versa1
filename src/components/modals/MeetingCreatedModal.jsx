import React, { useState } from 'react';
import { Copy, X, Shield } from 'lucide-react';

export default function MeetingCreatedModal({ isOpen, onClose, meeting, onJoinCall }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !meeting) return null;

  const meetingUrl = `${window.location.origin}/meet/${meeting.code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-24 left-6 z-50 w-full max-w-sm bg-white rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-gray-200 p-5 text-gray-800 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-[1.1rem] font-medium text-gray-900 leading-tight pr-4">Here's your joining information</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1.5 -m-1.5 rounded-full hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        Send this to people that you want to meet with. Make sure that you save it so that you can use it later, too.
      </p>

      <div className="flex items-center gap-2 bg-gray-100 rounded-md p-2">
        <span className="flex-1 text-sm font-medium text-gray-800 truncate px-1 select-all">
          {meetingUrl}
        </span>
        <button 
          onClick={handleCopy}
          className="text-gray-600 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-200 transition-colors shrink-0"
          title="Copy meeting link"
        >
          <Copy className="w-5 h-5" />
        </button>
      </div>
      
      <div className="mt-5 flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
        <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          <span className="font-semibold text-gray-700 block mb-0.5">Receive desktop notifications from Meet</span>
          Allowing notifications lets Meet alert you about incoming calls and updates that occur while you're in another tab.
        </p>
      </div>
    </div>
  );
}
