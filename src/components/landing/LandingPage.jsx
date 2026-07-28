import React from 'react';
import { Globe, Mic, Monitor, Users, Sparkles, ArrowRight, Play, Star, CheckCircle2 } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* Navbar (Landing Specific) */}
      <nav className="fixed top-0 w-full z-50 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0B0F19] rounded-[11px] flex items-center justify-center">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
              Lingua<span className="text-cyan-400">Versa</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
          </div>
          <button 
            onClick={onGetStarted}
            className="px-6 py-2.5 bg-white text-black hover:bg-slate-200 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold mb-8">
            <Sparkles className="w-4 h-4" /> Live Voice Translator
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8">
            Realtime, Accurate, <br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Everywhere.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto mb-12">
            Translates conversations instantly across 100+ languages with 0.2 second latency and 99.8% AI accuracy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white rounded-2xl font-bold text-lg flex items-center gap-2 shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-all transform hover:scale-105"
            >
              Start Translating <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-lg flex items-center gap-2 border border-white/10 transition-all">
              <Play className="w-5 h-5" /> Watch Demo
            </button>
          </div>

          {/* Social Proof */}
          <div className="mt-20 pt-10 border-t border-white/5 flex flex-wrap justify-center gap-12 text-center">
            <div>
              <div className="text-4xl font-black text-white mb-1">4.8/5</div>
              <div className="flex justify-center gap-1 text-yellow-500 mb-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <div className="text-sm text-slate-500 uppercase tracking-wider font-bold">App Store Rating</div>
            </div>
            <div>
              <div className="text-4xl font-black text-white mb-2">200k+</div>
              <div className="text-sm text-slate-500 uppercase tracking-wider font-bold">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-black text-white mb-2">0.2s</div>
              <div className="text-sm text-slate-500 uppercase tracking-wider font-bold">Average Latency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-24 px-6 bg-[#0A0E1A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Perfect Solutions for Every Scenario</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Whether you're in a meeting, conference, or watching content online, LinguaVersa adapts to your communication needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#0B0F19] rounded-3xl p-8 border border-white/5 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">In-Person Conversations</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Listen and understand speakers in foreign languages during face-to-face meetings, conferences, or social gatherings.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> Real-time speech recognition</li>
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> Instant translation display</li>
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> Live AI voice synthesis</li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="bg-[#0B0F19] rounded-3xl p-8 border border-white/5 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
                <Monitor className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Online Meetings</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Follow along in virtual meetings, webinars, and video calls when the speaker is using a language you're not native in.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-purple-400" /> Secure peer-to-peer video rooms</li>
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-purple-400" /> Live translation overlay</li>
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-purple-400" /> Meeting transcription export</li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="bg-[#0B0F19] rounded-3xl p-8 border border-white/5 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6">
                <Mic className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Floating Subtitles</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Watch YouTube videos, online courses, and streaming content with floating live subtitles in your preferred language.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-rose-400" /> Floating Picture-in-Picture overlay</li>
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-rose-400" /> Works across all apps</li>
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium"><CheckCircle2 className="w-5 h-5 text-rose-400" /> Customizable subtitle appearance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <section className="py-32 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/20"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl font-black mb-8">Ready to Break Language Barriers?</h2>
          <p className="text-xl text-slate-400 mb-12">
            Join thousands of users who are already communicating without limits across languages and platforms.
          </p>
          <button 
            onClick={onGetStarted}
            className="px-10 py-5 bg-white text-black hover:bg-slate-200 rounded-2xl font-black text-xl shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105"
          >
            Open Web App
          </button>
        </div>
      </section>

    </div>
  );
}
