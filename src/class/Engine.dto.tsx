import { Source } from '@/entities/Source'
import { RenderEngine } from './RenderEngine'

export namespace Engine {
  export interface Interface<T> {
    render: (file: Source.Type, y: number, force?: boolean) => void
    map: Map<Source.Id, T>
    get: (file: Source.Type) => T
    is: (file: Source.Type) => boolean
  }

  export type Constructor = RenderEngine

  export type List = 'height' | 'graph' | 'default'
}

export namespace Hardcode {
  export const Scale = Symbol('Scale');

  export const Height = Symbol('Height')
  export interface Height {
    [Height]: Hardcode.Height
  }

  export const MaxHeight = Symbol('MaxHeight')
  export interface MaxHeight {
    [MaxHeight]: Hardcode.Height
  }

  export const MinHeight = Symbol('MinHeight')
  export interface MinHeight {
    [MinHeight]: Hardcode.Height
  }

  export const Length = Symbol('Length')
  export interface Length {
    [Length]: Hardcode.Length
  }

  export const Start = Symbol('Start')
  export const End = Symbol('End')
  export interface StartEnd {
    [Start]: number
    [End]: number
  }
}

export const λCache = Symbol('Cache')
