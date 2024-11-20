import { λFile } from "@/dto/File.dto";
import { RenderEngine } from "./RenderEngine";

export namespace Engine {
  export interface Interface<T> {
    render: (file: λFile, y: number) => void;
    get: (file: λFile) => T;
    is: (file: λFile) => boolean;
    map: Map<λFile['uuid'], T>;
  }

  export type Constructor = RenderEngine;

  export type List = 'height' | 'graph' | 'apache' | 'default';
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
export interface Scale {
  [Scale]: Hardcode.Scale
}

export const Height = Symbol('Height');
export interface Height {
  [Height]: Hardcode.Height;
}

export const MaxHeight = Symbol('MaxHeight');
export interface MaxHeight {
  [MaxHeight]: Hardcode.Height;
}

export const Length = Symbol('Length');
export interface Length {
  [Length]: Hardcode.Length;
}



export const Start = Symbol('Start');
export const End = Symbol('End');
export interface StartEnd {
  [Start]: Hardcode.Timestamp;
  [End]: Hardcode.Timestamp;
}
