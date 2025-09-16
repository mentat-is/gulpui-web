import { toast } from 'sonner'
import { UUID } from 'crypto'
import { Info, MinMax, MinMaxBase } from '@/class/Info'
import { ChangeEvent, RefObject } from 'react'
import { XY, XYBase } from '@/dto/XY.dto'
import { SetState } from '@/class/API'
import { Logger } from '@/dto/Logger.class'
import { Request } from '@/entities/Request'
import { Source } from '@/entities/Source'
import { Doc } from '@/entities/Doc'
import { App } from '@/entities/App'
import { Color } from '@/entities/Color'
import { Internal } from '@/entities/addon/Internal'

export const parseTokensFromCookies = (tokens: string) => {
  try {
    return JSON.parse(tokens as string)
  } catch (_) {
    return Array.isArray(tokens) ? tokens : []
  }
}

const colorCache = new Map<string, Color.Type>()

export const stringToHexColor = (str: string): Color.Type => {
  if (colorCache.has(str)) return colorCache.get(str)!

  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }

  const color = `#${[0, 1, 2]
    .map(i => ((hash >> (i * 8)) & 0xff).toString(16).padStart(2, '0'))
    .join('')}` as Color.Type

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
  app: App.Type,
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


export function generateUUID<T>(prefix?: Request.Prefix): T {
  const base = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16) as UUID
  });

  if (prefix) {
    return `${prefix}-${base}` as T;
  }

  return base as T;
}

export const getLimits = (
  app: App.Type,
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
  file: Source.Type,
  event: Doc.Type,
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

  /**
   * Use this function to trigger react dependents rendering that uses this object
   * @param obj Object
   * @returns Object
   */
  public static object = <T extends object>(obj: T) => ({ ...obj }) as T;

  /**
   * Use this function to trigger react dependents rendering that uses this array
   * @param obj Object
   * @returns Object
   */
  public static array = <T extends object>(...obj: T[]) => ([...obj]) as T[];
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