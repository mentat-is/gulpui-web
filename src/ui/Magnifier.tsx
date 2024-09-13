import React from 'react';
import s from './styles/Magnifier.module.css';

interface MagnifierProps {
  isVisible: boolean;
  self: React.RefObject<HTMLCanvasElement>;
  mousePosition: { x: number; y: number };
  size?: number;
}

export const Magnifier: React.FC<MagnifierProps> = ({ isVisible, self, mousePosition, size = 200 }) => {
  if (!isVisible) return null;

  return (
    <canvas ref={self} width={size} style={{
      top: `${mousePosition.y}px`,
      left: `${mousePosition.x}px`
    }} height={size} className={s.magnifier} />
  );
};
