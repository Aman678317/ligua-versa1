import React, { useState, useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const [vantaEffect, setVantaEffect] = useState(null);
  const myRef = useRef(null);

  useEffect(() => {
    let effect;
    let attempts = 0;
    
    const initVanta = () => {
      if (myRef.current && window.VANTA && window.VANTA.GLOBE) {
        effect = window.VANTA.GLOBE({
          el: myRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x41369d,
          color2: 0x5890b3,
          size: 1.50,
          backgroundColor: 0x251c39,
          THREE: window.THREE // Pass THREE explicitly just in case
        });
        setVantaEffect(effect);
      } else if (attempts < 20) {
        attempts++;
        setTimeout(initVanta, 500);
      }
    };

    initVanta();

    return () => {
      if (effect) effect.destroy();
    };
  }, []);

  return (
    <div 
      ref={myRef} 
      id="vanta-bg"
      className="fixed inset-0 z-[-1]"
      style={{ width: '100%', height: '100%', position: 'fixed', top: 0, left: 0, zIndex: -1 }}
    />
  );
};

export default AnimatedBackground;
