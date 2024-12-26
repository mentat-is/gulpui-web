import { UUID } from "crypto";
import { λIndex } from "./Index.dto";
import { Color } from "@impactium/types";
import { μ } from "@/class/Info";
import { Gradients } from "@/ui/utils";
import { Engine } from "@/class/Engine.dto";
import { intersection } from "lodash";

export type GulpDataType = 'operation' | 'context' | 'file';

interface ΞSelectionField {
  selected?: boolean;
}

type Extendable = Record<string, any>;

export type GulpObject<T extends typeof μ, E extends Extendable = {}> = ΞSelectionField & {
  id: T;
  color: Color;
  type: GulpDataType;
  time_created: number;
  time_updated: number;
  glyph_id: UUID | null;
  name: string;
  // TODO
  granted_user_ids: Array<unknown>,
  // TODO
  granted_user_group_ids: Array<unknown>,
} & E

type ΞOperation<T extends Extendable = {}> = GulpObject<μ.Operation, T> & {
  index: λIndex['name']
};

export type λOperation = ΞOperation<{
  contexts: ΞContext['id'][];
}>

export type OperationTree = ΞOperation<{
  contexts: ΞContext<{
    sources: ΞFile[]
  }>[]
}>

type ΞContext<T extends Extendable = {}> = GulpObject<μ.Context, T> & {
  operation_id: λOperation['id'],
  description: string | null;
}

export type λContext = ΞContext<{
  files: λFile['id'][];
}>

type ΞFile<T extends Extendable = {}> = GulpObject<μ.File, T> & {
  operation_id: λOperation['id'];
  context_id: ΞContext['id'];
  description: string | null;
}

export type λFile = ΞFile & {
  pinned?: boolean;
  settings: ΞSettings;
  detailed: ΞDetailed;
};

interface ΞSettings {
  color: Color | Gradients;
  engine: Engine.List;
  offset: number;
  focusField: string | string[];
}

type ΞDetailed = Record<string, any>;