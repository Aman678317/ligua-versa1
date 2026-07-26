import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Languages, Sparkles, FileText, CheckCheck } from 'lucide-react';

export default function InCallChat({ isOpen, onClose, messages, onSendMessage, selectedLanguage, languages }) {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    onSendMessage({
      text: inputText.trim(),
      originalLang: selectedLanguage,
      file: attachedFile
    });

    setInputText('');
    setAttachedFile(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type
      });
    }
  };

  return (
    <div className="w-80 sm:w-96 bg-[#0A0E1A]/95 border-l border-white/10 flex flex-col h-full z-40 backdrop-blur-2xl shadow-2xl">
      
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Live Translated Chat <Sparkles className="w-3.5 h-3.5 text-[#00E5C7]" />
            </h3>
            <p className="text-[10px] text-slate-400">Auto-translating to your language ({selectedLanguage.toUpperCase()})</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="p-4 rounded-full bg-slate-900 border border-white/10 text-slate-500">
              <Languages className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold text-slate-300">No chat messages yet</p>
            <p className="text-[11px] text-slate-500">Type a message below. It will automatically be translated to each recipient's language!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-1 group">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="font-bold text-slate-200">{msg.senderName}</span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 text-xs space-y-1.5 shadow-md">
                
                {/* Translated Text (Recipient Language) */}
                <p className="text-slate-100 font-medium leading-relaxed">
                  {msg.translatedText || msg.text}
                </p>

                {/* Original Text Subtitle if different */}
                {msg.translatedText && msg.translatedText !== msg.text && (
                  <p className="text-[10px] text-slate-400 italic border-t border-white/5 pt-1">
                    Original ({msg.originalLang}): "{msg.text}"
                  </p>
                )}

                {/* Attached File Preview */}
                {msg.file && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-white/10 flex items-center gap-2 text-slate-300">
                    <FileText className="w-4 h-4 text-[#00E5C7]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{msg.file.name}</p>
                      <p className="text-[9px] text-slate-500">{msg.file.size}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attached file chip indicator */}
      {attachedFile && (
        <div className="px-4 py-2 bg-indigo-950/60 border-t border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-[#00E5C7]" />
            <span className="truncate font-bold">{attachedFile.name}</span>
          </div>
          <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Controls */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-slate-950/90 flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-[#00E5C7] transition-all"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message to translate live..."
          className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5C7]/50"
        />

        <button
          type="submit"
          disabled={!inputText.trim() && !attachedFile}
          className="p-2.5 rounded-xl bg-[#00E5C7] hover:bg-[#00E5C7]/90 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
