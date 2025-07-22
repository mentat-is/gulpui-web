import { toast } from 'sonner'
import { UUID } from 'crypto'
import { λApp } from '@/dto'
import { Info, Internal, MinMax, MinMaxBase } from '@/class/Info'
import { ChangeEvent, RefObject } from 'react'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { λFile } from '@/dto/Dataset'
import { XY, XYBase } from '@/dto/XY.dto'
import { SetState } from '@/class/API'
import { Logger } from '@/dto/Logger.class'

export type Color = `#${string}`

export const parseTokensFromCookies = (tokens: string) => {
  try {
    return JSON.parse(tokens as string)
  } catch (_) {
    return Array.isArray(tokens) ? tokens : []
  }
}

const colorCache = new Map<string, Color>()

export const stringToHexColor = (str: string): Color => {
  if (colorCache.has(str)) return colorCache.get(str)!

  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }

  const color = `#${[0, 1, 2]
    .map(i => ((hash >> (i * 8)) & 0xff).toString(16).padStart(2, '0'))
    .join('')}` as Color

  colorCache.set(str, color)
  return color
}


export const parse = (str: string) => parseFloat(str.replace('px', ''))

export type JsonString<T> = string & { __jsonStringBrand: T }

export const copy = (value: string) => {
  try {
    navigator.clipboard.writeText(value)
    toast('Data copied to clipboard successfully', {
      description: 'Use CTRL + V to paste.',
    })
  } catch (error) {
    toast.error('Gulp doesn`t have access to clipboard')
  }
}

export const ui = (path: string): string =>
  `https://cdn.impactium.fun/ui/${path}.svg`

export const throwableByTimestamp = (
  timestamp: MinMax | number,
  limits: MinMax,
  app: λApp,
  offset = 0,
): boolean => {
  const time: number | MinMax =
    typeof timestamp === 'number'
      ? timestamp + offset
      : {
        min: timestamp.min + offset,
        max: timestamp.max + offset,
      }

  return typeof time === 'number'
    ? time < limits.min ||
    time > limits.max ||
    time < (app.timeline.frame.min || 0) ||
    time > (app.timeline.frame.max || Infinity)
    : time.max < limits.min ||
    time.min > limits.max ||
    time.max < (app.timeline.frame.min || 0) ||
    time.min > (app.timeline.frame.max || Infinity)
}

export function generateUUID<T>(): T {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16) as UUID
  }) as T
}
export const getLimits = (
  app: λApp,
  Info: Info,
  timeline: RefObject<HTMLDivElement>,
  scrollX: number,
): MinMax => {
  if (!app.timeline.frame) {
    return app.timeline.frame
  }

  const min =
    app.timeline.frame.min +
    (scrollX / Info.width) * (app.timeline.frame.max - app.timeline.frame.min)

  const max =
    app.timeline.frame.min +
    ((scrollX + (timeline.current?.clientWidth ?? 0)) / Info.width) *
    (app.timeline.frame.max - app.timeline.frame.min)

  return { min, max }
}

export const GradientsMap = {
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

export type Gradients = keyof typeof GradientsMap

export const arrayToLinearGradientCSS = (gradient: string[]): string =>
  `linear-gradient(to right, ${gradient.map((g) => '#' + g).join(', ')})`

export const getDateFormat = (diffInMilliseconds: number) => {
  const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24)
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60)
  const diffInMinutes = diffInMilliseconds / (1000 * 60)

  if (diffInDays >= 30) return 'dd.MM.yyyy'
  if (diffInDays >= 1) return 'dd.MM.yyyy'
  if (diffInHours >= 1) return 'HH:mm dd.MM'
  if (diffInMinutes >= 1) return 'HH:mm:ss dd.MM'
  return 'HH:mm:ss dd.MM.yyyy'
}

export const getTimestamp = (x: number, info: Info) => {
  const { min, max } = info.app.timeline.frame

  return Math.round(min + (x / info.width) * (max - min))
}

export const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  } else {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
}

export const COLORS: string[] = ['#a1a1a1', '#3399ff', '#ff4d4d', '#c99900', '#65b58b', '#009999', '#c266ff', '#ff408c']

const ERROR_COLOR = 0xff0000

const NumericGradientsMap: Record<Gradients, number[]> = (() => {
  const cache: Record<string, number[]> = {}
  for (const [key, gradient] of Object.entries(GradientsMap)) {
    cache[key] = gradient.map((color) => parseInt(color, 16) || ERROR_COLOR)
  }
  return cache as Record<Gradients, number[]>
})()

export class λColor {
  private static gradientCache = new Map<
    Gradients,
    Map<number, Map<number, Map<number, string>>>
  >()

  public static gradient = (
    target: Gradients,
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

    const gradient = NumericGradientsMap[target]
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
      (λColor.interpolateChannel(
        (color1 >> 16) & 0xff,
        (color2 >> 16) & 0xff,
        factor,
      ) <<
        16) |
      (λColor.interpolateChannel(
        (color1 >> 8) & 0xff,
        (color2 >> 8) & 0xff,
        factor,
      ) <<
        8) |
      λColor.interpolateChannel(color1 & 0xff, color2 & 0xff, factor)

    const finalColor = `#${result.toString(16).padStart(6, '0')}`
    maxCache.set(diff, finalColor)
    return finalColor
  }

  public static interpolateChannel = (
    c1: number,
    c2: number,
    factor: number,
  ): number => ((c1 + factor * (c2 - c1)) & 0xff) | 0
}

export const between = (num: number, min: number, max: number) =>
  num >= min && num <= max

export function numericRepresentationOfAnyString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i)
    hash = (hash * 31 + charCode) % Number.MAX_SAFE_INTEGER
  }
  return Math.abs(hash)
}

export function numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine(
  file: λFile,
  event: λEvent,
): number {
  let key: unknown = event[file.settings.field]

  if (typeof key === 'object' && key !== null) {
    key = Object.values(key).reduce((sum, value) => {
      return (
        sum +
        (parseInt(value.toString(), 10) ||
          numericRepresentationOfAnyString(value.toString()))
      )
    }, 0)
  }

  return ((typeof key === 'string' && numericRepresentationOfAnyString(key)) ||
    (typeof key === 'number' ? key : NaN) ||
    0)
}

export function download(content: string, type: string, name: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export namespace Algorhithm {
  export interface Constructor {
    frame: MinMax
    scroll: XY
    width: number
    scale: number
  }
}

export class Algorhithm implements Algorhithm.Constructor {
  frame: MinMax = MinMaxBase
  scroll: XY = XYBase(0)
  width = 1
  scale = 1

  constructor(constructor: Algorhithm.Constructor) {
    Object.assign(this, constructor)
  }

  abs_x_from_timestamp = (timestamp: number) =>
    Math.round(
      ((timestamp - this.frame.min) / (this.frame.max - this.frame.min)) *
      this.width,
    )

  rel_x_from_timestamp = (timestamp: number, scroll: XY = this.scroll) =>
    scroll ? this.abs_x_from_timestamp(timestamp) - scroll.x : -1

  center_scroll_from_timestamp = (timestamp: number) =>
    Math.round(
      this.abs_x_from_timestamp(timestamp) - this.width / (2 * this.scale),
    )

  timestamp_from_rel_x = (relX: number, scroll: XY = this.scroll) => {
    const absX = relX + scroll.x;
    const ratio = absX / this.width;
    return Math.round(this.frame.min + ratio * (this.frame.max - this.frame.min));
  }
}

export type Maybe<T> = T | null

export type Sometimes<T> = Maybe<T> | undefined

export type NotSure<T> = T[] | T

export type Usual<T> = Sometimes<T> & NotSure<T>

export const bich =
  (setState: SetState<string>) => (event: ChangeEvent<HTMLInputElement>) => {
    return setState(event.target.value)
  }

export const fws = { width: '100%' }

export async function sleep(ms = 0) {
  return new Promise(res => setTimeout(res, ms))
}


export type NodeFile = NonNullable<NonNullable<ChangeEvent<HTMLInputElement>['target']['files']>[0]>

export class Refractor {
  public static readonly reflect = {
    toVar: <T extends Record<string, any>>(obj: T) => {
      const reflection: Record<string, any> = {};
      Object.keys(obj).forEach(key => {
        reflection[`--${key}`] = obj[key];
      });
      return reflection as { [K in keyof T as `--${string & K}`]: T[K] };
    }
  }

  public static readonly string = {
    toNumber: (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
      }
      return hash % 8000;
    }
  }

  public static readonly any = {
    toNumber: (value: any): number => {
      switch (typeof value) {
        case 'string':
          return Refractor.string.toNumber(value);
        case 'number':
          return value;
        case 'bigint':
          return Internal.Transformator.toTimestamp(value);
        default:
          const result = Number(value);
          if (isNaN(result)) {
            return 0
          }
          return result;
      }
    }
  }
}

export interface RGB {
  r: number,
  g: number,
  b: number
}

export function getSortOrder<T>(arr: T[], compareFn: (a: T, b: T) => number): 'asc' | 'desc' | 'unsorted' {
  let asc = true;
  let desc = true;

  for (let i = 1; i < arr.length; i++) {
    const cmp = compareFn(arr[i - 1], arr[i]);
    if (cmp > 0) asc = false;
    if (cmp < 0) desc = false;
    if (!asc && !desc) return 'unsorted';
  }

  if (asc) return 'asc';
  if (desc) return 'desc';
  return 'unsorted';
}

export const formatTimestampToReadableString = (value: Date | number | string) => {
  try {
    const date = new Date(value);

    const pad = (n: number, z = 2) => ('00' + n).slice(-z);

    const getters = {
      year: Internal.Settings.isUTCTimestamps ? date.getUTCFullYear() : date.getFullYear(),
      month: Internal.Settings.isUTCTimestamps ? date.getUTCMonth() + 1 : date.getMonth() + 1,
      day: Internal.Settings.isUTCTimestamps ? date.getUTCDate() : date.getDate(),
      hour: Internal.Settings.isUTCTimestamps ? date.getUTCHours() : date.getHours(),
      minute: Internal.Settings.isUTCTimestamps ? date.getUTCMinutes() : date.getMinutes(),
      second: Internal.Settings.isUTCTimestamps ? date.getUTCSeconds() : date.getSeconds(),
      ms: Internal.Settings.isUTCTimestamps ? date.getUTCMilliseconds() : date.getMilliseconds(),
    }

    return 'yyyy.MM.dd HH:mm:ss SSS'
      .replace('yyyy', getters.year.toString())
      .replace('MM', pad(getters.month))
      .replace('dd', pad(getters.day))
      .replace('HH', pad(getters.hour))
      .replace('mm', pad(getters.minute))
      .replace('ss', pad(getters.second))
      .replace('SSS', pad(getters.ms, 3));
  } catch (error) {
    Logger.error(
      `Invalid time value. Expected number | string | Date, got ${value}`,
      'Timestamp',
    )
    return ''
  }
}