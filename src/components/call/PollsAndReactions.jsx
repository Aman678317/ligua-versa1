import React, { useState } from 'react';
import { BarChart3, Plus, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function EmojiReactionsOverlay({ floatingReactions }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {floatingReactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: '80%', x: `${r.x}%`, scale: 0.8 }}
            animate={{ opacity: 0, y: '10%', scale: 1.5, rotate: r.rotate }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            className="absolute text-4xl shadow-2xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function PollsModal({ isOpen, onClose, polls, onCreatePoll, onVotePoll }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) return;

    onCreatePoll({ question, options: validOptions });
    setQuestion('');
    setOptions(['', '']);
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#131B2E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            In-Call Live Polls
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Create New Poll
            </button>
          )}

          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 bg-slate-900 rounded-xl border border-indigo-500/30 space-y-3">
              <h4 className="text-xs font-bold text-indigo-300 uppercase">Create New Poll</h4>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Poll Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Should we adopt P75 1.8s STT threshold?"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">Options</label>
                {options.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                ))}

                {options.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setOptions([...options, ''])}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 bg-slate-800 text-xs text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg"
                >
                  Publish Poll
                </button>
              </div>
            </form>
          )}

          {/* Active Polls List */}
          <div className="space-y-4">
            {polls.length === 0 && !isCreating ? (
              <p className="text-center text-slate-500 text-xs py-4">No active polls in this call yet.</p>
            ) : (
              polls.map((poll) => {
                const totalVotes = poll.options.reduce((acc, o) => acc + o.votes, 0);

                return (
                  <div key={poll.id} className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
                    <h4 className="font-bold text-sm text-white">{poll.question}</h4>

                    <div className="space-y-2">
                      {poll.options.map((opt) => {
                        const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => onVotePoll(poll.id, opt.id)}
                            className="relative overflow-hidden p-2.5 rounded-lg border border-white/10 bg-slate-950 cursor-pointer hover:border-indigo-500/50 transition-all"
                          >
                            {/* Vote Progress Bar */}
                            <div
                              className="absolute inset-y-0 left-0 bg-indigo-600/30 transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />

                            <div className="relative flex items-center justify-between text-xs">
                              <span className="font-medium text-white">{opt.text}</span>
                              <span className="font-mono text-indigo-300 font-bold">{opt.votes} ({percent}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
