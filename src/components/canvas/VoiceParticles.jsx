import React, { useEffect, useRef } from 'react';

export default function VoiceParticles({ isSpeaking = true, amplitude = 50 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize HUD particles
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        baseRadius: Math.random() * 2 + 1,
        color: i % 3 === 0 ? '#00E5C7' : i % 3 === 1 ? '#5B8CFF' : '#8B5CF6',
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.05;

      const normAmp = Math.min(100, Math.max(0, amplitude)) / 100.0;
      const ampMultiplier = isSpeaking ? 1 + normAmp * 2.5 : 0.5;

      particles.forEach((p) => {
        p.x += p.speedX * ampMultiplier;
        p.y += p.speedY * ampMultiplier;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const currentRadius = p.baseRadius * (1 + Math.sin(time * 3 + p.pulseOffset) * 0.4) * (isSpeaking ? 1.5 : 1.0);

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = isSpeaking ? 14 : 4;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = isSpeaking ? 0.75 : 0.3;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isSpeaking, amplitude]);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
