import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Sessions } from "@/dto/Session.dto";
import { toast } from "sonner";
import { MinMax } from "@/dto/QueryMaxMin.dto";
import { UUID } from "crypto";
import { Info as Information} from "@/dto";
import { Info } from "@/class/Info";
import { RefObject } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ClassName = ClassValue | ClassValue[]

export const parseTokensFromCookies = (tokens: string | Sessions): Sessions => {
  try {
    return JSON.parse(tokens as string);
  } catch (_) {
    return Array.isArray(tokens) ? tokens : [];
  }
};

export const stringToHexColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
};

export function throttle(func: (...args: any[]) => void, limit: number) {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number;
  return function(...args: any[]) {
      if (!lastRan) {
          func(...args);
          lastRan = Date.now();
      } else {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(function() {
              if (Date.now() - lastRan >= limit) {
                  func(...args);
                  lastRan = Date.now();
              }
          }, limit - (Date.now() - lastRan));
      }
  };
}

export const parse = (str: string) => parseFloat(str.replace('px', ''));

export type JsonString<T> = string & { __jsonStringBrand: T };

export const copy = (value: string) => {
  navigator.clipboard.writeText(value);
  toast('Data copied to clipboard successfully', {
    description: 'Use CTRL + V to paste.'
  })
}

export const ui = (path: string): string => `https://cdn.impactium.fun/ui/${path}.svg`

export const colorToRgb = (color: string): [number, number, number] => {
  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
};

export const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const [r1, g1, b1] = colorToRgb(color1);
  const [r2, g2, b2] = colorToRgb(color2);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `rgb(${r}, ${g}, ${b})`;
};

export const getColorByCode = (code: number, min: number, max: number): string => {
  const ranges = [
    { min: 0, max: 99, color: 'rgb(128, 0, 128)' },
    { min: 100, max: 199, color: 'rgb(255, 255, 255)' },
    { min: 200, max: 299, color: 'rgb(0, 255, 0)' },
    { min: 300, max: 399, color: 'rgb(0, 0, 255)' },
    { min: 400, max: 499, color: 'rgb(255, 165, 0)' },
    { min: 500, max: 599, color: 'rgb(255, 0, 0)' }
  ];

  for (let i = 0; i < ranges.length - 1; i++) {
    const { min, max, color } = ranges[i];
    const nextColor = ranges[i + 1].color;

    if (code >= min && code <= max) {
      const nextRange = ranges[i + 1];
      const rangeSize = nextRange.min - min;
      const positionInRange = (code - min) / rangeSize;
      return interpolateColor(color, nextColor, positionInRange);
    }
  }

  return ranges[ranges.length - 1].color;
};

// WARNING: offset should be added
export const throwableByTimestamp = (timestamp: MinMax | number, limits: MinMax, offset: number = 0): boolean => typeof timestamp === 'number' ? timestamp + offset < limits.min || timestamp + offset > limits.max : timestamp.max + offset < limits.min || timestamp.min + offset > limits.max;

export function generateUUID(): UUID {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16) as UUID;
  }) as UUID;
}
export const getLimits = (app: Information, Info: Info, timeline: RefObject<HTMLDivElement>, scrollX: number): MinMax => {
  const min = app.target.bucket!.selected.min + 
    (scrollX / Info.width) * (app.target.bucket!.selected.max - app.target.bucket!.selected.min);

  const max = app.target.bucket!.selected.min + 
    ((scrollX + timeline.current!.clientWidth) / Info.width) * 
    (app.target.bucket!.selected.max - app.target.bucket!.selected.min);

  return { min, max };
};