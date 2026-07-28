import React from 'react';
import { Video, Sparkles, BarChart2, BookOpen, Globe, UserCheck, ShieldCheck, Sliders, LogIn, Ghost } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, selectedLanguage, setSelectedLanguage, languages, onOpenAuth }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-[#0B0F19] rounded-[11px] flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
              Lingua<span className="text-cyan-400">Versa</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              v1.1 Live
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'summary'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            AI Summaries
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Telemetry
          </button>

          <button
            onClick={() => setActiveTab('whispers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'whispers'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Ghost className="w-4 h-4" />
            Whispers
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Settings
          </button>
        </nav>

        {/* Right Section: Language Picker & Profile */}
        <div className="flex items-center gap-3">
          
          {/* Target Language Dropdown */}
          <div className="relative flex items-center bg-slate-900/90 border border-white/15 rounded-xl px-3 py-1.5 gap-2 hover:border-cyan-500/50 transition-colors shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Translate to:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* User Profile / Auth */}
          {currentUser ? (
            <div 
              onClick={onOpenAuth}
              className="flex items-center gap-2 pl-2 border-l border-white/10 cursor-pointer hover:opacity-80"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full ring-2 ring-indigo-500/50 object-cover"
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-200">{currentUser.name}</p>
                <p className="text-[10px] text-cyan-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Host Pro
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
