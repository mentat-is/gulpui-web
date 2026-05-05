import { MinMax } from "@/class/Info"

export namespace Color {
  export type Type = `#${string}`;

  export const GEIST: number[] = [0xa1a1a1, 0x3399ff, 0xff4d4d, 0xc99900, 0x65b58b, 0x009999, 0xc266ff, 0xff408c]
  export const GEIST_STRINGS: string[] = Object.values(Color.GEIST).map(s => '#' + s.toString(16).padStart(6, '0'));

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

  export interface Theme {
    FONT_ACCENT: string;
    FONT_SECOND: string;
    BACKGROUND_ACCENT: string;
    BACKGROUND_SECOND: string;
    BORDER: string;
  }

  export class Themer {
    /** Per-named-theme canvas color palettes, matching the CSS themes in global.css. */
    public static readonly THEMES: Record<string, Theme> = {
      'dark-old': {
        FONT_ACCENT: '#ededed',
        FONT_SECOND: '#888888',
        BACKGROUND_ACCENT: '#000',
        BACKGROUND_SECOND: '#0e0e0e',
        BORDER: '#303030',
      },
      'light-old': {
        FONT_ACCENT: '#171717',
        FONT_SECOND: '#303030',
        BACKGROUND_ACCENT: '#fff',
        BACKGROUND_SECOND: '#f0f0f0',
        BORDER: '#dddddd',
      },
      'dracula': {
        // Dracula: fg=#f8f8f2, comment=#6272a4, selection=#44475a, bg=#282a36
        FONT_ACCENT: '#f8f8f2',
        FONT_SECOND: '#6272a4',
        BACKGROUND_ACCENT: '#282a36',
        BACKGROUND_SECOND: '#21222c',
        BORDER: '#44475a',
      },
      'forest': {
        // Forest: deep green background with minty foreground accents.
        FONT_ACCENT: '#b8d8c8',
        FONT_SECOND: '#8fb8a6',
        BACKGROUND_ACCENT: '#0b1b13',
        BACKGROUND_SECOND: '#10281d',
        BORDER: '#2f5a45',
      },
      'dark': {
        // Solarized Dark: base03=#002b36, base02=#073642, base1=#93a1a1, base0=#839496, base01=#586e75
        FONT_ACCENT: '#93a1a1',
        FONT_SECOND: '#839496',
        BACKGROUND_ACCENT: '#002b36',
        BACKGROUND_SECOND: '#073642',
        BORDER: '#586e75',
      },
      'light': {
        // Solarized Light: base3=#fdf6e3, base2=#eee8d5, base01=#586e75, base00=#657b83, base1=#93a1a1
        FONT_ACCENT: '#586e75',
        FONT_SECOND: '#657b83',
        BACKGROUND_ACCENT: '#fdf6e3',
        BACKGROUND_SECOND: '#eee8d5',
        BORDER: '#93a1a1',
      },
    };

    public static theme: Theme = Themer.THEMES['dark-old'];

    public static setTheme(theme: string) {
      Themer.theme = Themer.THEMES[theme] ?? Themer.THEMES['dark-old'];
    }

    /** @deprecated Use setTheme(name) with named theme keys. Kept for backwards compatibility. */
    public static getTheme(theme: 'light' | 'dark'): Theme {
      return theme === 'light' ? Themer.THEMES['light-old'] : Themer.THEMES['dark-old'];
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
