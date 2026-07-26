import React from 'react';
import { BarChart2, Zap, Clock, Globe, Cpu, Activity, ShieldCheck, CheckCircle, Server } from 'lucide-react';

export default function AdminAnalytics({ analytics }) {
  if (!analytics) return null;

  const isP75Compliant = analytics.p75LatencyMs < 2500;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-cyan-400 font-mono">
            System Metering & AI Pipeline Performance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Admin Telemetry & Latency Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> WebRTC & Speech Engines Operational
        </div>
      </div>

      {/* Hero P75 Latency Metric Meter Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl transition-all relative overflow-hidden ${
        isP75Compliant
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-cyan-500/30'
          : 'bg-rose-950/40 border-rose-500/40'
      }`}>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-mono">
              <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> Goal Metric: P75 Latency Target &lt; 2500ms
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-baseline gap-3">
              {analytics.p75LatencyMs} ms
              <span className="text-sm font-semibold text-emerald-400 font-mono">
                ⚡ {Math.round(((2500 - analytics.p75LatencyMs) / 2500) * 100)}% Faster Than Target
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300">
              End-to-end pipeline: Audio capture → Whisper-v3 STT → Neural Machine Translation → Piper TTS Synthesis.
            </p>
          </div>

          {/* Latency Stage Breakdown Capsules */}
          <div className="w-full md:w-auto grid grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-white/10">
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">STT Stage</span>
              <span className="text-base font-bold text-cyan-300">{analytics.sttAvgLatencyMs}ms</span>
              <span className="text-[9px] text-slate-500 block">Whisper-v3</span>
            </div>

            <div className="text-center space-y-1 border-x border-white/10 px-2">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">NMT Stage</span>
              <span className="text-base font-bold text-indigo-300">{analytics.nmtAvgLatencyMs}ms</span>
              <span className="text-[9px] text-slate-500 block">Neural Translation</span>
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">TTS Stage</span>
              <span className="text-base font-bold text-purple-300">{analytics.ttsAvgLatencyMs}ms</span>
              <span className="text-[9px] text-slate-500 block">Piper / Edge-TTS</span>
            </div>
          </div>
        </div>

      </div>

      {/* Grid KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Active Calls */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Active Calls</span>
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-2xl font-extrabold text-white">{analytics.activeCallsCount}</p>
          <p className="text-[11px] text-cyan-400">Live WebRTC streams</p>
        </div>

        {/* Total Translated Minutes */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Translated Minutes</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{analytics.totalTranslatedMinutes.toLocaleString()}</p>
          <p className="text-[11px] text-indigo-400">Total speech converted</p>
        </div>

        {/* Audio Chunks Processed */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Audio Chunks</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{analytics.totalAudioChunks.toLocaleString()}</p>
          <p className="text-[11px] text-purple-400">Metered via AiMetric</p>
        </div>

        {/* TURN Server Status */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">TURN Relay (v1.1)</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">Active</p>
          <p className="text-[11px] text-slate-400">Cross-network fallback ready</p>
        </div>

      </div>

      {/* Language Usage & Latency Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Language Distribution */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" /> Live Language Usage Distribution
          </h3>

          <div className="space-y-3">
            {analytics.languageDistribution.map((item) => (
              <div key={item.language} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-200">{item.language}</span>
                  <span className="text-cyan-400 font-mono">{item.percentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latency Trend */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" /> End-to-End Latency Trend (Last Hour)
          </h3>

          <div className="space-y-4 pt-2">
            {analytics.latencyTrend.map((t) => (
              <div key={t.time} className="flex items-center gap-4 text-xs">
                <span className="font-mono text-slate-400 w-12">{t.time}</span>
                <div className="flex-1 h-3 bg-slate-950 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${(t.latency / 2500) * 100}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-cyan-300 w-16 text-right">{t.latency} ms</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
