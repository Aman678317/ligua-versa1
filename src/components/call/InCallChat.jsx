import React, { useState } from 'react';
import { Send, Paperclip, Sparkles, X, FileText, Globe } from 'lucide-react';

export default function InCallChat({ isOpen, onClose, messages, onSendMessage, selectedLanguage, languages }) {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    onSendMessage({
      text: inputText,
      originalLang: selectedLanguage,
      file: attachedFile
    });

    setInputText('');
    setAttachedFile(null);
  };

  const currentLangObj = languages.find(l => l.code === selectedLanguage) || { name: 'English', flag: '🇺🇸' };

  return (
    <div className="w-80 sm:w-96 border-l border-white/10 bg-[#131B2E] flex flex-col h-full z-20 shadow-2xl">
      
      {/* Drawer Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm text-white">Live Translated Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target Language Indicator */}
      <div className="px-4 py-2 bg-indigo-950/40 border-b border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-indigo-400" /> Auto-translating to:
        </span>
        <span className="font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded font-mono">
          {currentLangObj.flag} {currentLangObj.name}
        </span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
            <Sparkles className="w-8 h-8 text-slate-600 animate-pulse" />
            <p className="text-xs">No messages yet.<br/>Type below to chat in your own language!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{msg.senderName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({msg.originalLang.toUpperCase()})</span>
                </div>
                <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div className="bg-slate-900 p-3 rounded-2xl border border-white/5 text-xs text-slate-200 space-y-1">
                <p>{msg.text}</p>

                {/* Auto-translated subtext if different language */}
                {msg.originalLang !== selectedLanguage && (
                  <p className="text-[11px] font-medium text-cyan-300 pt-1 border-t border-white/5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Translated: {msg.text}
                  </p>
                )}

                {/* Attached File Preview */}
                {msg.file && (
                  <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg text-[11px] text-indigo-300 mt-1">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                    <span className="truncate">{msg.file.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* File Attachment Chip */}
      {attachedFile && (
        <div className="px-4 py-1.5 bg-indigo-900/30 border-t border-white/10 flex items-center justify-between text-xs text-indigo-300">
          <span className="truncate max-w-[200px]">📎 {attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-slate-900/80 flex items-center gap-2">
        
        <label className="p-2 text-slate-400 hover:text-white cursor-pointer hover:bg-white/10 rounded-xl transition-colors">
          <Paperclip className="w-4 h-4" />
          <input
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setAttachedFile(e.target.files[0])}
          />
        </label>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Type in ${currentLangObj.name}...`}
          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />

        <button
          type="submit"
          className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>

      </form>

    </div>
  );
}
