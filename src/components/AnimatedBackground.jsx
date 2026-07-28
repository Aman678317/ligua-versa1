import React, { useState, useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const [vantaEffect, setVantaEffect] = useState(null);
  const myRef = useRef(null);

  useEffect(() => {
    if (!vantaEffect && window.VANTA) {
      setVantaEffect(
        window.VANTA.HALO({
          el: myRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          backgroundColor: 0x131a43,
          baseColor: 0x1a59,
          size: 1,
          amplitudeFactor: 1,
          xOffset: 0,
          yOffset: 0
        })
      );
    }
    
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return (
    <div 
      ref={myRef} 
      className="fixed inset-0 z-[-1] overflow-hidden" 
    />
  );
};

export default AnimatedBackground;
