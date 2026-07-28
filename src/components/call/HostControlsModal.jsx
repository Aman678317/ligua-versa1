import React from 'react';
import { Shield, Lock, Unlock, MicOff, UserCheck, UserX, UserPlus, Eye, MessageSquare, Share2, X } from 'lucide-react';

export default function HostControlsModal({
  isOpen,
  onClose,
  participants,
  waitingRoomList,
  roomSettings,
  onUpdateSettings,
  onMuteAll,
  onAdmitParticipant,
  onRemoveParticipant,
  voiceCloningEnabled,
  onToggleVoiceCloning
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#131B2E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Shield className="w-5 h-5 text-cyan-400" />
            Host Security & Meeting Controls
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Quick Security Toggles */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Security & Access</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Lock Room */}
              <div 
                onClick={() => onUpdateSettings({ isLocked: !roomSettings.isLocked })}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  roomSettings.isLocked
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-slate-900/60 border-white/10 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {roomSettings.isLocked ? <Lock className="w-5 h-5 text-rose-400" /> : <Unlock className="w-5 h-5 text-slate-400" />}
                  <div>
                    <p className="text-sm font-semibold">Lock Meeting</p>
                    <p className="text-[11px] opacity-70">Prevent new participants from joining</p>
                  </div>
                </div>
              </div>

              {/* Waiting Room Toggle */}
              <div 
                onClick={() => onUpdateSettings({ waitingRoomEnabled: !roomSettings.waitingRoomEnabled })}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  roomSettings.waitingRoomEnabled
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-slate-900/60 border-white/10 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-sm font-semibold">Waiting Room</p>
                    <p className="text-[11px] opacity-70">Host approval required to enter</p>
                  </div>
                </div>
              </div>

              {/* Voice Cloning Toggle */}
              <div 
                onClick={onToggleVoiceCloning}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  voiceCloningEnabled
                    ? 'bg-[#00E5C7]/10 border-[#00E5C7]/30 text-[#00E5C7]'
                    : 'bg-slate-900/60 border-white/10 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className={`w-5 h-5 ${voiceCloningEnabled ? 'text-[#00E5C7]' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-sm font-semibold">Voice Cloning</p>
                    <p className="text-[11px] opacity-70">Use cloned voice for translation</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Host Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Audio & Moderator Tools</h4>
            
            <button
              onClick={onMuteAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-sm border border-rose-500/20 transition-all shadow-md"
            >
              <MicOff className="w-4 h-4 text-rose-400" />
              Mute All Participants
            </button>
          </div>

          {/* Waiting Room Queue */}
          {waitingRoomList && waitingRoomList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Waiting Room ({waitingRoomList.length})
                </h4>
              </div>

              <div className="space-y-2 bg-indigo-950/20 p-3 rounded-xl border border-indigo-500/30">
                {waitingRoomList.map((user) => (
                  <div key={user.socketId} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <img src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} className="w-8 h-8 rounded-full" alt="" />
                      <div>
                        <p className="text-xs font-bold text-white">{user.name}</p>
                        <p className="text-[10px] text-slate-400">Language: {user.spokenLanguage || 'English'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onAdmitParticipant(user.socketId)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Admit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Participants List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Participants ({participants.length})
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {participants.map((p) => (
                <div key={p.socketId || p.id} className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <img src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} className="w-8 h-8 rounded-full" alt="" />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        {p.name}
                        {p.isHost && <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">HOST</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">{p.email || 'Participant'}</p>
                    </div>
                  </div>

                  {!p.isHost && (
                    <button
                      onClick={() => onRemoveParticipant(p.socketId)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove participant"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl transition-colors"
          >
            Close Controls
          </button>
        </div>

      </div>
    </div>
  );
}
