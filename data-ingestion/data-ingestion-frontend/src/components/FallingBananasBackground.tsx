import React, { useMemo } from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

const NUM_BANANAS = 75;

interface BananaConfig {
  id: number;
  style: React.CSSProperties;
  wrapperStyle: React.CSSProperties;
}

const FallingBananasBackground: React.FC = () => {
  const bananas = useMemo(() => {
    return Array.from({ length: NUM_BANANAS }).map((_, i) => {
      const size = Math.random() * (150 - 50) + 50; // Increased size
      const duration = Math.random() * (20 - 10) + 10; // Faster fall
      const delay = Math.random() * 10; // Spawn earlier
      const rotation = Math.random() * 360;
      const flip = Math.random() > 0.5 ? 1 : -1;

      return {
        id: i,
        wrapperStyle: {
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: '-150px', // Start off-screen
          animation: `fall ${duration}s linear ${delay}s infinite`,
        },
        style: {
          width: `${size}px`,
          height: 'auto',
          opacity: Math.random() * (0.35 - 0.1) + 0.1, // More prominent
          transform: `rotate(${rotation}deg) scaleX(${flip})`,
          color: '#FFD700', // Use brand yellow for color
        },
      } as BananaConfig;
    });
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {bananas.map(({ id, style, wrapperStyle }) => (
        <div key={id} style={wrapperStyle}>
          <BananaGuideIcon style={style} />
        </div>
      ))}
    </div>
  );
};

export default FallingBananasBackground;
