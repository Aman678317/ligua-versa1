import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Plus, RefreshCw } from 'lucide-react';
import CreateWhisperModal from './CreateWhisperModal';

export default function WhispersFeed() {
  const [whispers, setWhispers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchWhispers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whispers');
      const data = await res.json();
      if (data.success) {
        setWhispers(data.whispers);
      }
    } catch (e) {
      console.error('Failed to fetch whispers:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWhispers();
  }, []);

  const handleLike = async (id) => {
    // Optimistic UI update
    setWhispers(prev => prev.map(w => w.id === id ? { ...w, likes: w.likes + 1, hasLiked: true } : w));
    try {
      await fetch(`/api/whispers/${id}/like`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to like whisper:', e);
    }
  };

  const handleWhisperCreated = (newWhisper) => {
    setWhispers(prev => [newWhisper, ...prev]);
  };

  return (
    <div className="flex-1 bg-[#0B0F19] p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">Confessions</h1>
            <p className="text-slate-400">Share your thoughts anonymously with the community.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchWhispers}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-semibold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Share a Whisper</span>
            </button>
          </div>
        </div>

        {/* Masonry Grid */}
        {loading && whispers.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {whispers.map((w) => (
              <div 
                key={w.id} 
                className="break-inside-avoid relative rounded-2xl overflow-hidden shadow-2xl group border border-white/5 bg-[#0A0E1A]"
              >
                {/* Background Image */}
                <div className="relative aspect-[3/4] w-full">
                  <div className="absolute inset-0 bg-slate-900/40 z-0"></div>
                  <img 
                    src={w.bgImageUrl} 
                    alt="Background" 
                    className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] contrast-125 saturate-50"
                  />
                  
                  {/* Text Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
                    <h3 
                      className="text-white text-2xl md:text-3xl font-black text-center leading-tight drop-shadow-2xl font-serif"
                      style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8)' }}
                    >
                      {w.text}
                    </h3>
                  </div>

                  {/* Hover Controls / Footer */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-center">
                    <button 
                      onClick={() => handleLike(w.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-all ${w.hasLiked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
                    >
                      <Heart className={`w-4 h-4 ${w.hasLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-bold">{w.likes}</span>
                    </button>
                    
                    <div className="flex gap-2">
                      <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateWhisperModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreated={handleWhisperCreated}
      />
    </div>
  );
}
