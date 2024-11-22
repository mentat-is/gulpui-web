import { HTMLAttributes, useCallback, useEffect, useRef } from "react";
import s from "./styles/SymmetricSvg.module.css";
import { cn } from "./utils";

interface SymmetricSvgProps extends HTMLAttributes<HTMLCanvasElement> {
  text: string;
  loading?: boolean;
}

export const SymmetricSvg = ({ text, loading, className, ...props }: SymmetricSvgProps) => {
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
      .map(shift => ((hash >> shift) & 0xff).toString(16).padStart(2, "0"))
      .join("")}`;
  }, []);

  const generateDistinctColor = useCallback((str: string, baseColor: string) => {
    const parseColor = (color: string) => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    const colorDistance = (c1: string, c2: string) => {
      const [r1, g1, b1] = parseColor(c1);
      const [r2, g2, b2] = parseColor(c2);
      return Math.sqrt((r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2);
    };

    let newColor = generateColor(str);
    while (colorDistance(newColor, baseColor) < 100) {
      const [r, g, b] = parseColor(newColor).map(val => (val + 128) % 256);
      newColor = `#${[r, g, b].map(val => val.toString(16).padStart(2, "0")).join("")}`;
    }

    return newColor;
  }, [generateColor]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const rectSize = 6;
    const random = generateRandom(text);
    const color1 = generateColor(text.substring(0, 16));
    const color2 = generateDistinctColor(text.substring(17, 32), color1);

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 3; col++) {
        const isColor1 = random() > 0.5;
        const fill = isColor1 ? color1 : color2;

        // Draw the rectangle
        context.fillStyle = fill;
        context.fillRect(col * rectSize, row * rectSize, rectSize, rectSize);

        // Draw the reflected rectangle
        context.fillRect((5 - col) * rectSize, row * rectSize, rectSize, rectSize);
      }
    }
  }, [text, generateRandom, generateColor, generateDistinctColor]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(s.canvas, loading && s.loading, className)}
      width="36"
      height="36"
      {...props}
    />
  );
};
