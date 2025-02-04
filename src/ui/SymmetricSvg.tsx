import { HTMLAttributes, useCallback, useEffect, useRef } from 'react';
import s from './styles/SymmetricSvg.module.css';
import { cn } from '@impactium/utils';

interface SymmetricSvgProps extends HTMLAttributes<HTMLCanvasElement> {
  text: string;
  loading?: boolean;
  size?: number;
}

export const SymmetricSvg = ({ text, loading, className, size = 32, ...props }: SymmetricSvgProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateRandom = useCallback((str: string) => {
    let seed = Array.from(str).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return Math.abs(seed / 233280);
    };
  }, []);

  const generateColor = useCallback((str: string) => {
    const hash = Array.from(str).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return `#${[16, 8, 0]
      .map(shift => ((hash >> shift) & 0xff).toString(16).padStart(2, '0'))
      .join('')}`;
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const rectSize = 4;
    const gridSize = size / rectSize;
    const random = generateRandom(text);
    const color1 = generateColor(text.substring(0, 16));
    const color2 = generateColor(text.substring(17, 32));

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize / 2; col++) {
        const fill = random() > 0.5 ? color1 : color2;
        context.fillStyle = fill;

        context.fillRect(col * rectSize, row * rectSize, rectSize, rectSize);
        context.fillRect((gridSize - 1 - col) * rectSize, row * rectSize, rectSize, rectSize);
      }
    }
  }, [text, size, generateRandom, generateColor]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(s.canvas, loading && s.loading, className)}
      width={size}
      height={size}
      {...props}
    />
  );
};
