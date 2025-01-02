import { λIndex } from './Index.dto';
import { Color } from '@impactium/types';
import { Info, Internal, λUser, μ } from '@/class/Info';
import { Gradients } from '@/ui/utils';
import { Engine } from '@/class/Engine.dto';
import { MinMax } from '@/class/Info';
import { λEvent } from './ChunkEvent.dto';

export type GulpDataType = 'operation' | 'context' | 'file' | 'link' | 'note';

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
  glyph_id: λGlyph['id'] | null;
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
  code: MinMax;
  timestamp: MinMax;
  nanotimestamp: MinMax;
  total: number;
};

export interface ΞSettings {
  color: Gradients;
  engine: Engine.List;
  offset: number;
  field: keyof λEvent;
}

export type λLink<T extends Extendable = {}> = GulpObject<μ.Link, T> & {
  owner_user_id: string,
  description: string,
  operation_id: λOperation['id'],
  tags: string[];
  doc_id_from: λEvent['id'];
  doc_ids: λEvent['id'][];
}

export type λNote<T extends Extendable = {}> = GulpObject<μ.Note, T> & {
  type: 'note',
  description: string,
  operation_id: λOperation['id'],
  tags: string[],
  context_id: λContext['id'],
  source_id: λFile['id'],
  docs: unknown[],
  time_pin: number,
  last_editor_id: λUser,
  text: string,
  edits: Record<string, any>[];
}

export interface λGlyph {
  id: μ.Glyph;
  name: string;
  img: string;
}
