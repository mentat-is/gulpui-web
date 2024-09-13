import { HTMLAttributes } from "react";
import s from './styles/SymmetricSvg.module.css'
import { cn } from "./utils";

interface SymmetricSvgProps extends HTMLAttributes<SVGSVGElement> {
  text: string;
  loading?: boolean;
}

export const SymmetricSvg = ({ text, loading, className, ...props }: SymmetricSvgProps) => {
  const generateRandomFromText = (str: string) => {
    let seed = 0;
    for (let i = 0; i < str.length; i++) {
      seed = str.charCodeAt(i) + ((seed << 5) - seed);
    }
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return Math.abs(seed / 233280);
    };
  };
  
  const generateColorFromString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
  
    const r = (hash >> 16) & 0xFF;
    const g = (hash >> 8) & 0xFF;
    const b = hash & 0xFF;
  
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  const parse = (color: string) => [1, 3, 5].map(i => parseInt(color.substring(i, i + 2), 16));
  
  const colorDistance = (c1: string, c2: string) => {
    const [r1, g1, b1] = parse(c1);
    const [r2, g2, b2] = parse(c2);
    return Math.sqrt((r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2);
  }
  
  
  const generateDistinctColor = (str: string, existingColor: string) => {
    let newColor = generateColorFromString(str);
  
    while (colorDistance(newColor, existingColor) < 100) {
      let [r, g, b] = parse(newColor)
  
      r = (r + 128) % 256;
      g = (g + 128) % 256;
      b = (b + 128) % 256;
  
      newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  
    return newColor;
  }

  const color1 = generateColorFromString(text.substring(0, 16));
  const color2 = generateDistinctColor(text.substring(17, 32), color1);
  const rectSize = 6;
  const grid = [];
  const random = generateRandomFromText(text);

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 3; col++) {
      const isColor1 = random() > 0.5;
      const fill = isColor1 ? color1 : color2;

      grid.push(
        <rect
          key={`rect-${row}-${col}`}
          x={col * rectSize}
          y={row * rectSize}
          width={rectSize + 0.5}
          height={rectSize + 0.5}
          fill={fill}
        />,
        <rect
          key={`rect-reflected-${row}-${col}`}
          x={(5 - col) * rectSize}
          y={row * rectSize}
          width={rectSize + 0.5}
          height={rectSize + 0.5}
          fill={fill}
        />
      );
    }
  }

  return (
    <svg className={cn(s.svg, loading && s.loading, className)} width="36" height="36" viewBox="0 0 36 36" {...props}>
      {grid}
    </svg>
  );
};