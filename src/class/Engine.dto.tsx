import { λFile } from "@/dto/File.dto";
import { RenderEngine } from "./RenderEngine";

export type EngineList = 'height' | 'graph' | 'apache' | 'default';

export type EngineConstructor = RenderEngine;

class EngineDeclarations {
  declare private get: <T = Map<any, any>>(file: λFile) => T;
  declare private is: (file: λFile) => boolean;
}

export interface Engine extends EngineDeclarations {
  render: (file: λFile, y: number) => void;
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
}


const Scale = Symbol('Scale');
export interface Scale {
  [Scale]: Hardcode.Scale
}

const Height = Symbol('Height');
export interface Height {
  [Height]: Hardcode.Height;
}

const MaxHeight = Symbol('MaxHeight');
export interface MaxHeight {
  [MaxHeight]: Hardcode.Height;
}

const Start = Symbol('Start');
const End = Symbol('End');
export interface StartEnd {
  [Start]: Hardcode.Timestamp;
  [End]: Hardcode.Timestamp;
}
