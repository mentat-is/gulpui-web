import { MinMax } from "@/class/Info"
import { th } from "date-fns/locale";

export namespace Color {
  export type Type = `#${string}`;

  export const GEIST: number[] = [0xa1a1a1, 0x3399ff, 0xff4d4d, 0xc99900, 0x65b58b, 0x009999, 0xc266ff, 0xff408c]
  export const GRADIENT = {
    thermal: [
      '0000c1',
      '8600d0',
      'd00086',
      'ff014f',
      'ff7800',
      'ffbe00',
      'ffff01',
    ],
    rainbow: [
      "9400d3",
      "4b0082",
      "0000ff",
      "00ff00",
      "ffff00",
      "ff7f00",
      "ff0000"
    ],
    sepal: ['fe2400', 'fcfafd', '7e51fe'],
    deep: ['54aef3', '142f48'],
    sunset: ['432371', 'faae7b'],
    eclipse: ['f5c900', '183182'],
    saga: ['9d80cb', 'f7c2e6'],
  }

  export const FROM_CSS = {

  } as const;

  export interface Theme {
    FONT_ACCENT: string;
    FONT_SECOND: string;
    BACKGROUND_ACCENT: string;
    BACKGROUND_SECOND: string;
    BORDER: string;
  }

  export class Themer {
    public static readonly PALETTE = {
      BLACK_ACCENT: '#000',
      BLACK_SECOND: '#0e0e0e',
      BLACK_BORDER: '#303030',
      WHITE_ACCENT: '#fff',
      WHITE_SECOND: '#f0f0f0',
      WHITE_BORDER: '#ddd',
    } as const;

    public static theme: Theme = Themer.getTheme('dark');

    public static setTheme(theme: string) {
      if (!['light', 'dark'].includes(theme)) {
        theme = 'dark';
      }

      Themer.theme = Themer.getTheme(theme as 'light' | 'dark');
    }
    public static getTheme(theme: 'light' | 'dark'): Theme {
      if (theme === 'light') {
        return {
          FONT_ACCENT: this.PALETTE.BLACK_ACCENT,
          FONT_SECOND: this.PALETTE.BLACK_BORDER,
          BACKGROUND_ACCENT: this.PALETTE.WHITE_ACCENT,
          BACKGROUND_SECOND: this.PALETTE.WHITE_SECOND,
          BORDER: this.PALETTE.WHITE_BORDER
        }
      }
      return {
        FONT_ACCENT: this.PALETTE.WHITE_ACCENT,
        FONT_SECOND: this.PALETTE.WHITE_BORDER,
        BACKGROUND_ACCENT: this.PALETTE.BLACK_ACCENT,
        BACKGROUND_SECOND: this.PALETTE.BLACK_SECOND,
        BORDER: this.PALETTE.BLACK_BORDER
      }
    }
  }

  export type Gradient = keyof typeof GRADIENT

  const ERROR_COLOR = GEIST[2];

  const NUMERIC_GRADIENT_MAP: Record<Gradient, number[]> = (() => {
    const cache: Record<string, number[]> = {}
    for (const [key, gradient] of Object.entries(GRADIENT)) {
      cache[key] = gradient.map((color) => parseInt(color, 16) || ERROR_COLOR)
    }
    return cache as Record<Gradient, number[]>
  })()

  export class Entity {
    private static gradientCache = new Map<
      Gradient,
      Map<number, Map<number, Map<number, string>>>
    >()

    public static gradient = (
      target: Gradient,
      diff: number,
      delta: MinMax,
    ): string => {
      let targetCache = this.gradientCache.get(target)
      if (!targetCache) {
        targetCache = new Map()
        this.gradientCache.set(target, targetCache)
      }

      let deltaCache = targetCache.get(delta.min)
      if (!deltaCache) {
        deltaCache = new Map()
        targetCache.set(delta.min, deltaCache)
      }

      let maxCache = deltaCache.get(delta.max)
      if (!maxCache) {
        maxCache = new Map()
        deltaCache.set(delta.max, maxCache)
      }

      const value = maxCache.get(diff)
      if (value) {
        return value
      }

      const gradient = NUMERIC_GRADIENT_MAP[target]
      const numColors = gradient.length

      const deltaRange = delta.max - delta.min
      if (deltaRange <= 0) {
        const color = `#${gradient[0].toString(16).padStart(6, '0')}`
        maxCache.set(diff, color)
        return color
      }

      const percentage = (diff - delta.min) / deltaRange
      const scaledIndex = percentage * (numColors - 1)

      const lowerIndex = scaledIndex | 0
      const upperIndex = Math.min(lowerIndex + 1, numColors - 1)
      const factor = scaledIndex - lowerIndex

      const color1 = gradient[lowerIndex]
      const color2 = gradient[upperIndex]

      const result =
        (Color.Entity.interpolate(
          (color1 >> 16) & 0xff,
          (color2 >> 16) & 0xff,
          factor,
        ) <<
          16) |
        (Color.Entity.interpolate(
          (color1 >> 8) & 0xff,
          (color2 >> 8) & 0xff,
          factor,
        ) <<
          8) |
        Color.Entity.interpolate(color1 & 0xff, color2 & 0xff, factor)

      const finalColor = `#${result.toString(16).padStart(6, '0')}`
      maxCache.set(diff, finalColor)
      return finalColor
    }

    public static interpolate = (
      c1: number,
      c2: number,
      factor: number,
    ): number => ((c1 + factor * (c2 - c1)) & 0xff) | 0
  }

}