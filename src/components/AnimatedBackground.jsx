import React from 'react';

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#0c102c]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[100px] opacity-80 mix-blend-screen pointer-events-none animation-aurora">
        {/* Core shape built with conic gradients to mimic the folded 3D fluid look */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#9b51e0] via-[#ff51a8] to-[#00e5c7] rounded-full animate-morph" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-[10%] bg-gradient-to-bl from-[#fff9c4] via-[#b388ff] to-[#40c4ff] rounded-full animate-morph-reverse" style={{ animationDuration: '15s', opacity: 0.9 }} />
        <div className="absolute inset-[25%] bg-white rounded-full blur-[20px] opacity-60 animate-pulse-slow" style={{ animationDuration: '8s' }} />
      </div>
      
      {/* Additional ambient glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#3a0ca3] rounded-full blur-[150px] opacity-40 animate-blob" style={{ animationDuration: '12s' }} />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#4361ee] rounded-full blur-[150px] opacity-30 animate-blob" style={{ animationDuration: '14s', animationDelay: '2s' }} />
    </div>
  );
};

export default AnimatedBackground;
