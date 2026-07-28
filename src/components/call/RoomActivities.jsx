import React, { useState, useEffect, useRef } from 'react';
import { Youtube, PenTool, X, Play, Pause } from 'lucide-react';

export default function RoomActivities({ 
  isOpen, 
  onClose, 
  socket, 
  roomCode, 
  currentUser 
}) {
  const [activeTab, setActiveTab] = useState('whiteboard'); // 'whiteboard' | 'youtube'
  
  // YouTube State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState(null);
  
  // Whiteboard State
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#00E5C7');

  useEffect(() => {
    if (!isOpen || !socket) return;

    // Listen for socket events from peers
    const handleDraw = (data) => {
      drawOnCanvas(data.x0, data.y0, data.x1, data.y1, data.color, false);
    };

    const handleYoutubeSync = (data) => {
      if (data.action === 'load') {
        setVideoId(data.videoId);
        setActiveTab('youtube');
      }
      // Note: Full iframe sync requires YouTube Iframe API. 
      // For now, we sync the video load.
    };

    socket.on('draw-line', handleDraw);
    socket.on('youtube-sync', handleYoutubeSync);

    return () => {
      socket.off('draw-line', handleDraw);
      socket.off('youtube-sync', handleYoutubeSync);
    };
  }, [isOpen, socket]);

  // Whiteboard Logic
  useEffect(() => {
    if (activeTab === 'whiteboard' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Set actual size in memory (scaled to account for retina displays)
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
    }
  }, [activeTab, isOpen]);

  const currentPos = useRef({ x: 0, y: 0 });

  const getCoordinates = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const coords = getCoordinates(e);
    currentPos.current = coords;
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    
    drawOnCanvas(currentPos.current.x, currentPos.current.y, coords.x, coords.y, color, true);
    currentPos.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawOnCanvas = (x0, y0, x1, y1, strokeColor, emit) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.closePath();

    if (!emit || !socket) return;
    socket.emit('draw-line', {
      roomCode,
      x0, y0, x1, y1, color: strokeColor
    });
  };

  // YouTube Logic
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleLoadVideo = () => {
    const id = extractVideoId(youtubeUrl);
    if (id) {
      setVideoId(id);
      socket.emit('youtube-sync', { roomCode, action: 'load', videoId: id });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-4 right-4 w-96 bg-[#0A0E1A]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col z-40 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-bold text-white text-sm">Activities</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button 
          onClick={() => setActiveTab('whiteboard')}
          className={`flex-1 p-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'whiteboard' ? 'text-[#00E5C7] border-b-2 border-[#00E5C7] bg-[#00E5C7]/10' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <PenTool className="w-4 h-4"/> Whiteboard
        </button>
        <button 
          onClick={() => setActiveTab('youtube')}
          className={`flex-1 p-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'youtube' ? 'text-red-400 border-b-2 border-red-500 bg-red-500/10' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Youtube className="w-4 h-4"/> YouTube
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        
        {activeTab === 'whiteboard' && (
          <div className="flex-1 flex flex-col bg-white">
            {/* Toolbar */}
            <div className="p-2 border-b border-slate-200 flex items-center justify-center gap-2 bg-slate-50">
              {['#00E5C7', '#ef4444', '#3b82f6', '#eab308', '#000000'].map(c => (
                <button 
                  key={c} 
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-110'} transition-transform`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button 
                onClick={() => {
                  if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                  }
                }}
                className="ml-2 text-[10px] font-bold text-slate-500 hover:text-slate-800"
              >
                CLEAR
              </button>
            </div>
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              className="flex-1 w-full h-full cursor-crosshair touch-none"
            />
          </div>
        )}

        {activeTab === 'youtube' && (
          <div className="flex-1 flex flex-col p-4 space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Paste YouTube Link"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
              <button 
                onClick={handleLoadVideo}
                className="bg-red-600 hover:bg-red-700 text-white px-3 rounded-xl text-xs font-bold transition-colors"
              >
                Watch
              </button>
            </div>

            {videoId ? (
              <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative bg-black">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50">
                <Youtube className="w-12 h-12 mb-2" />
                <p className="text-xs">Paste a link to watch together</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
