import React, { useEffect, useRef } from 'react';

export default function SpeechCanvas3D({ isSpeaking = true, frequencyData = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let angle = 0;

    // Resize canvas to container
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 450;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize 3D particle field
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2.5 + 1,
        color: i % 2 === 0 ? '#06b6d4' : '#8b5cf6',
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        pulseSpeed: Math.random() * 0.05 + 0.02
      });
    }

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.02;

      // Draw 3D Radial Speech Audio Wave Ring
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(centerX, centerY) * 0.55;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Glowing outer ring
      ctx.beginPath();
      const points = 64;
      for (let i = 0; i < points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const freqVal = frequencyData[i % frequencyData.length] || Math.sin(angle + i) * 15 + 20;
        const r = baseRadius + (isSpeaking ? freqVal * 0.6 : 5);

        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const gradient = ctx.createRadialGradient(0, 0, baseRadius * 0.5, 0, 0, baseRadius * 1.3);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = isSpeaking ? 'rgba(6, 182, 212, 0.4)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = isSpeaking ? 2 : 1;
      ctx.stroke();

      ctx.restore();

      // Render Floating 3D Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const currentRadius = p.radius + (isSpeaking ? Math.sin(angle * 3) * 1.2 : 0);

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = isSpeaking ? 12 : 4;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = isSpeaking ? 0.8 : 0.4;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isSpeaking, frequencyData]);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
    </div>
  );
}
