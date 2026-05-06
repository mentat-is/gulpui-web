import { MinMax } from "@/class/Info"

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function parseHexColor(color: string): RgbColor | null {
  const hex = color.replace('#', '').trim()

  if (hex.length === 3) {
    const [r, g, b] = hex.split('')
    return {
      r: parseInt(`${r}${r}`, 16),
      g: parseInt(`${g}${g}`, 16),
      b: parseInt(`${b}${b}`, 16),
    }
  }

  if (hex.length !== 6) {
    return null
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

function hueToRgb(p: number, q: number, t: number): number {
  let next = t

  if (next < 0) next += 1
  if (next > 1) next -= 1
  if (next < 1 / 6) return p + (q - p) * 6 * next
  if (next < 1 / 2) return q
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6

  return p
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  const hue = ((h % 360) + 360) % 360 / 360
  const saturation = Math.max(0, Math.min(100, s)) / 100
  const lightness = Math.max(0, Math.min(100, l)) / 100

  if (saturation === 0) {
    const channel = Math.round(lightness * 255)
    return { r: channel, g: channel, b: channel }
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q

  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  }
}

function parseCssColor(color: string): RgbColor | null {
  const value = color.trim()

  if (!value) {
    return null
  }

  if (value.startsWith('#')) {
    return parseHexColor(value)
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim()))

    if ([r, g, b].some(Number.isNaN)) {
      return null
    }

    return { r, g, b }
  }

  const hslMatch = value.match(/^hsla?\(([^)]+)\)$/i)
  if (hslMatch) {
    const [h, s, l] = hslMatch[1]
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim().replace('%', '')))

    if ([h, s, l].some(Number.isNaN)) {
      return null
    }

    return hslToRgb(h, s, l)
  }

  if (typeof window !== 'undefined' && typeof CSS !== 'undefined' && CSS.supports('color', value)) {
    const probe = document.createElement('span')
    probe.style.color = value
    probe.style.display = 'none'
    document.body.appendChild(probe)

    const resolved = getComputedStyle(probe).color
    document.body.removeChild(probe)

    const namedColor = resolved.match(/^rgba?\(([^)]+)\)$/i)
    if (!namedColor) {
      return null
    }

    const [r, g, b] = namedColor[1]
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim()))

    if ([r, g, b].some(Number.isNaN)) {
      return null
    }

    return { r, g, b }
  }

  return null
}

function relativeLuminance({ r, g, b }: RgbColor): number {
  const normalize = (channel: number): number => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b)
}

export namespace Color {
  export type Type = `#${string}`;
  export type ThemeMode = 'light' | 'dark';

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

  function readCssColor(
    style: CSSStyleDeclaration,
    variableName: string,
  ): string | null {
    const value = style.getPropertyValue(variableName).trim()
    return value || null
  }

  export class Themer {
    /** Generic fallback palettes used before CSS variables are readable. */
    public static readonly MODES: Record<ThemeMode, Theme> = {
      dark: {
        FONT_ACCENT: '#ededed',
        FONT_SECOND: '#888888',
        BACKGROUND_ACCENT: '#000',
        BACKGROUND_SECOND: '#0e0e0e',
        BORDER: '#303030',
      },
      light: {
        FONT_ACCENT: '#171717',
        FONT_SECOND: '#303030',
        BACKGROUND_ACCENT: '#fff',
        BACKGROUND_SECOND: '#f0f0f0',
        BORDER: '#dddddd',
      },
    };

    private static readonly DEFAULT_MODE: ThemeMode = 'dark';
    private static readonly DEFAULT_THEME = Themer.MODES[Themer.DEFAULT_MODE];

    public static theme: Theme = Themer.DEFAULT_THEME;
    public static currentMode: ThemeMode = Themer.DEFAULT_MODE;

    private static getResolvedTheme(fallbackMode?: ThemeMode): Theme {
      const nextMode = Themer.getModeFromCssVariables() ?? fallbackMode ?? Themer.getPreferredMode()
      const cssTheme = Themer.getThemeFromCssVariables()

      Themer.currentMode = nextMode
      Themer.theme = cssTheme ?? Themer.MODES[nextMode] ?? Themer.DEFAULT_THEME

      return Themer.theme
    }

    private static getThemeFromCssVariables(): Theme | null {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return null
      }

      const style = getComputedStyle(document.documentElement)
      const FONT_ACCENT = readCssColor(style, '--accent')
      const FONT_SECOND = readCssColor(style, '--second')
      const BACKGROUND_ACCENT = readCssColor(style, '--background-200')
      const BACKGROUND_SECOND = readCssColor(style, '--background-100')
      const BORDER = readCssColor(style, '--gray-alpha-400') ?? readCssColor(style, '--gray-500')

      if (!FONT_ACCENT || !FONT_SECOND || !BACKGROUND_ACCENT || !BACKGROUND_SECOND || !BORDER) {
        return null
      }

      return {
        FONT_ACCENT,
        FONT_SECOND,
        BACKGROUND_ACCENT,
        BACKGROUND_SECOND,
        BORDER,
      }
    }

    private static getModeFromCssVariables(): ThemeMode | null {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return null
      }

      const mode = getComputedStyle(document.documentElement).getPropertyValue('--theme-mode').trim()
      return mode === 'light' || mode === 'dark' ? mode : null
    }

    private static getPreferredMode(): ThemeMode {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light'
      }

      return Themer.currentMode
    }

    private static syncThemeFromCssVariables(fallbackMode?: ThemeMode) {
      Themer.getResolvedTheme(fallbackMode)
    }

    public static getTargetGuideColor(): string {
      if (typeof window !== 'undefined') {
        const red = getComputedStyle(document.documentElement).getPropertyValue('--red-700').trim();
        if (red) {
          return red;
        }
      }

      return '#ff4d4d';
    }

    public static getReadablePaletteTextColor(backgroundColor: string): string {
      const theme = Themer.getResolvedTheme()
      const background = parseCssColor(backgroundColor)

      if (!background) {
        return theme.FONT_ACCENT
      }

      const paletteCandidates = [
        theme.FONT_ACCENT,
        theme.FONT_SECOND,
        theme.BACKGROUND_ACCENT,
        theme.BACKGROUND_SECOND,
      ]
        .map((color) => ({ color, rgb: parseCssColor(color) }))
        .filter((entry): entry is { color: string; rgb: RgbColor } => entry.rgb !== null)
        .sort((left, right) => relativeLuminance(left.rgb) - relativeLuminance(right.rgb))

      if (!paletteCandidates.length) {
        return theme.FONT_ACCENT
      }

      return relativeLuminance(background) > 0.55
        ? paletteCandidates[0].color
        : paletteCandidates[paletteCandidates.length - 1].color
    }

    public static setTheme(mode?: ThemeMode) {
      Themer.currentMode = mode ?? Themer.currentMode

      // Read the palette from the active CSS theme so canvas colors always match.
      Themer.syncThemeFromCssVariables(mode)

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          Themer.syncThemeFromCssVariables(mode)
        })
      }
    }

    /** @deprecated Use the active CSS theme palette or setTheme(mode). */
    public static getTheme(_: string): Theme {
      return Themer.getResolvedTheme();
    }

    /**
     * Returns a deterministic fractional alpha (0.05..0.15) derived from the
     * given string's hash.  Used to tint row backgrounds with the theme's
     * FONT_ACCENT colour, keeping monochrome themes fully monochrome.
     */
    public static contextTintAlpha(str: string): number {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i)
        hash |= 0
      }
      // Map to range 0.05..0.15
      return 0.05 + ((Math.abs(hash) % 100) / 100) * 0.10
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
