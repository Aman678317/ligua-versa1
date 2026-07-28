import React, { useState, useEffect, useRef } from 'react';

export default function VantaGlobe() {
  const [vantaEffect, setVantaEffect] = useState(null);
  const vantaRef = useRef(null);

  useEffect(() => {
    if (!vantaEffect && window.VANTA && window.VANTA.GLOBE) {
      setVantaEffect(
        window.VANTA.GLOBE({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          backgroundColor: 0x23153c,
          color: 0xff3f81,
          color2: 0xffffff,
          size: 1
        })
      );
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  // Use a wrapper that captures pointer events so you can interact with it if you want, 
  // or pointer-events-none if it's strictly background. The user wants a background,
  // but if mouseControls: true is set, it might need pointer events. However, typically it's behind content.
  // I'll make it absolute and set z-index to 0. 
  return <div ref={vantaRef} className="absolute inset-0 w-full h-full -z-10" />;
}
