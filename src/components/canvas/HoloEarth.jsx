import React, { useEffect, useRef } from 'react';

export default function HoloEarth() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let rotationAngle = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 500;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    resize();
    window.addEventListener('resize', resize);

    // City coordinates on globe (longitude, latitude)
    const cities = [
      { name: 'Tokyo', lat: 35.67, lon: 139.65 },
      { name: 'Mumbai', lat: 19.07, lon: 72.87 },
      { name: 'Berlin', lat: 52.52, lon: 13.40 },
      { name: 'New York', lat: 40.71, lon: -74.00 },
      { name: 'London', lat: 51.50, lon: -0.12 },
    ];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rotationAngle += 0.005;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.7;

      // Outer Holographic Aura
      const auraGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.3);
      auraGradient.addColorStop(0, 'rgba(0, 229, 199, 0.08)');
      auraGradient.addColorStop(0.6, 'rgba(91, 140, 255, 0.12)');
      auraGradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = auraGradient;
      ctx.fill();

      // Draw Wireframe Globe Latitudes
      for (let lat = -60; lat <= 60; lat += 20) {
        const radLat = (lat * Math.PI) / 180;
        const r = radius * Math.cos(radLat);
        const y = centerY + radius * Math.sin(radLat) * 0.4;

        ctx.beginPath();
        ctx.ellipse(centerX, y, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 229, 199, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Wireframe Longitudes
      const longitudes = 12;
      for (let i = 0; i < longitudes; i++) {
        const lonAngle = rotationAngle + (i / longitudes) * Math.PI * 2;
        const xOffset = Math.sin(lonAngle) * radius;

        ctx.beginPath();
        ctx.ellipse(centerX + xOffset * 0.2, centerY, radius * Math.cos(lonAngle), radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(91, 140, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Connecting Holographic Arcs Between Cities
      const projectedCities = cities.map(city => {
        const radLon = ((city.lon + rotationAngle * 100) * Math.PI) / 180;
        const radLat = (city.lat * Math.PI) / 180;

        const x = centerX + Math.cos(radLon) * Math.cos(radLat) * radius;
        const y = centerY - Math.sin(radLat) * radius * 0.6;
        const z = Math.sin(radLon) * Math.cos(radLat);

        return { ...city, x, y, z };
      });

      // Draw Connection Lines between Cities
      for (let i = 0; i < projectedCities.length; i++) {
        for (let j = i + 1; j < projectedCities.length; j++) {
          const c1 = projectedCities[i];
          const c2 = projectedCities[j];

          if (c1.z > -0.2 && c2.z > -0.2) {
            ctx.beginPath();
            ctx.moveTo(c1.x, c1.y);

            // Control point for arc curve
            const midX = (c1.x + c2.x) / 2;
            const midY = (c1.y + c2.y) / 2 - 40;

            ctx.quadraticCurveTo(midX, midY, c2.x, c2.y);
            ctx.strokeStyle = 'rgba(0, 229, 199, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      // Draw City Nodes
      projectedCities.forEach(c => {
        if (c.z > -0.3) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#00E5C7';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00E5C7';
          ctx.fill();

          ctx.font = '10px Plus Jakarta Sans, sans-serif';
          ctx.fillStyle = '#F4F6FF';
          ctx.fillText(c.name, c.x + 8, c.y + 3);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
