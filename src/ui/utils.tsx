import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Sessions } from "@/dto/Session.dto";
import { toast } from "sonner";
import { MinMax } from "@/dto/QueryMaxMin.dto";
import { UUID } from "crypto";
import { λApp } from "@/dto";
import { Info } from "@/class/Info";
import { RefObject } from "react";
import { icons } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ClassName = ClassValue | ClassValue[]

export type Color = `#${string}`;

export const parseTokensFromCookies = (tokens: string | Sessions): Sessions => {
  try {
    return JSON.parse(tokens as string);
  } catch (_) {
    return Array.isArray(tokens) ? tokens : [];
  }
};

export const stringToHexColor = (str: string): Color => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color as Color;
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
  try {
    navigator.clipboard.writeText(value);
    toast('Data copied to clipboard successfully', {
      description: 'Use CTRL + V to paste.'
    });
  } catch (error) {
    toast.error('Gulp doesn`t have access to clipboard');
  }
}

export const ui = (path: string): string => `https://cdn.impactium.fun/ui/${path}.svg`

export const colorToRgb = (color: string): [number, number, number] => {
  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
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

export const throwableByTimestamp = (timestamp: MinMax | number, limits: MinMax, offset: number = 0, app?: λApp): boolean => {
  const time: number | MinMax = typeof timestamp === 'number' ? timestamp + offset : {
    min: timestamp.min + offset,
    max: timestamp.max + offset
  };

  return typeof time === 'number' 
    ? time < limits.min || time > limits.max || time < (app?.target.bucket.selected.min || 0) || time > (app?.target.bucket.selected.max || Infinity)
    : time.max < limits.min || time.min > limits.max || time.max < (app?.target.bucket.selected.min || 0) || time.min > (app?.target.bucket.selected.max || Infinity);
}

export function generateUUID(): UUID {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16) as UUID;
  }) as UUID;
}
export const getLimits = (app: λApp, Info: Info, timeline: RefObject<HTMLDivElement>, scrollX: number): MinMax => {
  const min = app.target.bucket!.selected.min + 
    (scrollX / Info.width) * (app.target.bucket!.selected.max - app.target.bucket!.selected.min);

  const max = app.target.bucket!.selected.min + 
    ((scrollX + timeline.current!.clientWidth) / Info.width) * 
    (app.target.bucket!.selected.max - app.target.bucket!.selected.min);

  return { min, max };
};

export type λIcon = keyof typeof icons;

export const Icons = icons;

export const GradientsMap = {
  thermal: [
    'ffffaf',
    'ffff01',
    'ffd800',
    'ffbe00',
    'ff9f00',
    'ff7800',
    'ff4600',
    'ff014f',
    'ea004f',
    'd00086',
    'af00af',
    '8600d0',
    '4f00ea',
    '0000c1',
    '010198',
    '01016f',
  ],
  sepal: ['fe2400', 'fcfafd', '7e51fe'],
  deep: ['54aef3', '142f48'],
  sunset: ['432371', 'faae7b'],
  eclipse: ['f5c900', '183182'],
  saga: ['9d80cb', 'f7c2e6']
}

export type Gradients = keyof typeof GradientsMap;

export const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex, 16);
  return [
    (bigint >> 16) & 255,  // Красный канал
    (bigint >> 8) & 255,   // Зелёный канал
    bigint & 255           // Синий канал
  ];
};

export const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

export const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const result = c1.map((val, i) => Math.round(val + factor * (c2[i] - val)));

  return rgbToHex(result);
};

export const arrayToLinearGradientCSS = (gradient: string[]): string => `linear-gradient(to right, ${gradient.map(g => '#' + g).join(', ')})`;

export const getDateFormat = (diffInMilliseconds: number) => {
  const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
  const diffInMinutes = diffInMilliseconds / (1000 * 60);

  if (diffInDays >= 30) return 'dd.MM.yyyy';
  if (diffInDays >= 1) return 'dd.MM.yyyy';
  if (diffInHours >= 1) return 'HH:mm dd.MM';
  if (diffInMinutes >= 1) return 'HH:mm:ss dd.MM';
  return 'HH:mm:ss dd.MM.yyyy';
}

export const getTimestamp = (x: number, info: Info) => {
  const { min, max } = info.getBucketLocals()
  const width = info.width;

  return min + (x / width) * (max - min);
};

export const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
};

export class λColor {
  public static ['name -> hex'] = (color: string): string => {
    const colours = {
      aliceblue: '#f0f8ff',
      antiquewhite: '#faebd7',
      aqua: '#00ffff',
      aquamarine: '#7fffd4',
      azure: '#f0ffff',
      darkviolet: '#9400d3',
      deeppink: '#ff1493',
      deepskyblue: '#00bfff',
      dimgray: '#696969',
      dodgerblue: '#1e90ff',
      firebrick: '#b22222',
      floralwhite: '#fffaf0',
      forestgreen: '#228b22',
      fuchsia: '#ff00ff',
      gainsboro: '#dcdcdc',
      ghostwhite: '#f8f8ff',
      gold: '#ffd700',
      goldenrod: '#daa520',
      gray: '#808080',
      green: '#008000',
      greenyellow: '#adff2f',
      honeydew: '#f0fff0',
      hotpink: '#ff69b4',
      indianred: '#cd5c5c',
      indigo: '#4b0082',
      ivory: '#fffff0',
      khaki: '#f0e68c',
      lavender: '#e6e6fa',
      lavenderblush: '#fff0f5',
      lawngreen: '#7cfc00',
      lemonchiffon: '#fffacd',
      lightblue: '#add8e6',
      lightcoral: '#f08080',
      lightcyan: '#e0ffff',
      lightgoldenrodyellow: '#fafad2',
      lightgrey: '#d3d3d3',
      lightgreen: '#90ee90',
      lightpink: '#ffb6c1',
      oldlace: '#fdf5e6',
      olive: '#808000',
      olivedrab: '#6b8e23',
      orange: '#ffa500',
      orangered: '#ff4500',
      orchid: '#da70d6',
      palegoldenrod: '#eee8aa',
      palegreen: '#98fb98',
      paleturquoise: '#afeeee',
      palevioletred: '#d87093',
      papayawhip: '#ffefd5',
      peachpuff: '#ffdab9',
      saddlebrown: '#8b4513',
      salmon: '#fa8072',
      sandybrown: '#f4a460',
      seagreen: '#2e8b57',
      seashell: '#fff5ee',
      sienna: '#a0522d',
      silver: '#c0c0c0',
      skyblue: '#87ceeb',
      slateblue: '#6a5acd',
      slategray: '#708090',
      snow: '#fffafa',
      springgreen: '#00ff7f',
      steelblue: '#4682b4',
      tan: '#d2b48c',
      teal: '#008080',
      thistle: '#d8bfd8',
      tomato: '#ff6347',
      turquoise: '#40e0d0',
      violet: '#ee82ee',
      wheat: '#f5deb3',
      white: '#ffffff',
      whitesmoke: '#f5f5f5',
      yellow: '#ffff00',
      yellowgreen: '#9acd32'
    };
  
    if (color in colours) {
      return colours[color as keyof typeof colours];
    }
  
    return color;
  }

  /**
   * Функция для выбора цвета из градиента на основе delta и deltaMax
   */
  public static gradient = (target: Gradients, diff: number, delta: MinMax): string => {
    const gradient = GradientsMap[target];
    const numColors = gradient.length;
  
    const percentage = (diff - delta.min) / (delta.max - delta.min);
  
    if (Number.isNaN(percentage)) return `#${gradient[0]}`;
    
    // Находим индекс двух цветов в градиенте для интерполяции
    const scaledIndex = percentage * (numColors - 1);
    const lowerIndex = Math.floor(scaledIndex);
    const upperIndex = Math.min(Math.ceil(scaledIndex), numColors - 1);
    
    // Интерполяция между двумя ближайшими цветами
    const factor = scaledIndex - lowerIndex;
    return interpolateColor(gradient[lowerIndex], gradient[upperIndex], factor);
  };
}

export const between = (num: number, min: number, max: number) => num >= min && num <= max;