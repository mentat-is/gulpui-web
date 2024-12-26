import { λFile } from "@/dto/Operation.dto";
import { RenderEngine } from "./RenderEngine";

export namespace Engine {
  export interface Interface<T> {
    render: (file: λFile, y: number, force?: boolean) => void;
    map: Map<λFile['id'], T>;
    get: (file: λFile) => T;
    is: (file: λFile) => boolean;
  }

  export type Constructor = RenderEngine;

  export type List = 'height' | 'graph' | 'default';
}

export namespace Hardcode {
  export const Timestamp = Symbol('Timestamp');
  export type Timestamp = number & {
    readonly [Timestamp]: unique symbol;
  };

  export const Height = Symbol('Height');
  export type Height = number & {
    readonly [Height]: unique symbol;
  };

  export const X = Symbol('X');
  export type X = number & {
    readonly [X]: unique symbol;
  };

  export const Scale = Symbol('Scale');
  export type Scale = number & {
    readonly [Scale]: unique symbol;
  };

  export const Length = Symbol('Length');
  export type Length = number & {
    readonly [Length]: unique symbol;
  };
}


export const Scale = Symbol('Scale');
// eslint-disable-next-line
export interface Scale {
  [Scale]: Hardcode.Scale
}

export const Height = Symbol('Height');
// eslint-disable-next-line
export interface Height {
  [Height]: Hardcode.Height;
}

export const MaxHeight = Symbol('MaxHeight');
// eslint-disable-next-line
export interface MaxHeight {
  [MaxHeight]: Hardcode.Height;
}

export const MinHeight = Symbol('MinHeight');
// eslint-disable-next-line
export interface MinHeight {
  [MinHeight]: Hardcode.Height;
}

export const Length = Symbol('Length');
// eslint-disable-next-line
export interface Length {
  [Length]: Hardcode.Length;
}



export const Start = Symbol('Start');
export const End = Symbol('End');
export interface StartEnd {
  [Start]: Hardcode.Timestamp;
  [End]: Hardcode.Timestamp;
}
