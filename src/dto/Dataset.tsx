import { λIndex } from './Index.dto';
import { Color } from '@impactium/types';
import { Info, Internal, λUser, μ } from '@/class/Info';
import { Gradients } from '@/ui/utils';
import { Engine } from '@/class/Engine.dto';
import { MinMax } from '@/class/Info';
import { λDoc, λEvent, ΞDoc } from './ChunkEvent.dto';
import { Icon } from '@impactium/icons';

export type GulpDataType = 'operation' | 'context' | 'file' | 'link' | 'note' | 'user';

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

export type λFile = Omit<ΞFile, 'color'> & {
  pinned?: boolean;
  settings: ΞSettings;
  code: MinMax;
  timestamp: MinMax;
  nanotimestamp: MinMax<bigint>;
  total: number;
  color: Gradients
};

export interface ΞSettings {
  color: Gradients;
  engine: Engine.List;
  offset: number;
  field: keyof λEvent;
}

export type ΞLink<T extends Extendable = {}> = GulpObject<μ.Link, T> & {
  owner_user_id: string,
  description: string,
  operation_id: λOperation['id'],
  tags: string[];
  doc_id_from: λEvent['id'];
  doc_ids: λEvent['id'][];
}

export type λLink<T extends Extendable = {}> = ΞLink<{
  docs: λDoc[]
} & T>

export type ΞNote<T extends Extendable = {}> = GulpObject<μ.Note, T> & {
  type: 'note',
  operation_id: λOperation['id'],
  tags: string[],
  context_id: λContext['id'],
  source_id: λFile['id'],
  docs: ΞDoc[],
  time_pin: number,
  last_editor_id: λUser,
  text: string,
  edits: Record<string, any>[];
} 

export type λNote<T extends Extendable = {}> = GulpObject<μ.Note, T> & {
  type: 'note',
  description: string,
  operation_id: λOperation['id'],
  tags: string[],
  context_id: λContext['id'],
  source_id: λFile['id'],
  docs: λDoc[],
  time_pin: number,
  last_editor_id: λUser,
  text: string,
  edits: Record<string, any>[];
};

export type λRequest = {
  id: μ.Request;
  type: 'query' | 'ingest',
  for: λFile['id'] | null;
  status: 'done' | 'failed' | 'canceled' | 'ongoing' | 'pending' | 'error' | 'success';
  on: number;
};

export namespace Default {
  type Object = 'INDEX' | 'OPERATION' | 'CREATE_OPERATION' | 'CONTEXT' | 'FILE' | 'NOTE' | 'LINK' | 'EVENT';

  export const Icon: Record<Object, Icon.Name> = {
    INDEX: 'Database',
    OPERATION: 'BookDashed',
    CREATE_OPERATION: 'BookPlus',
    CONTEXT: 'Box',
    EVENT: 'Triangle',
    FILE: 'File',
    NOTE: 'StickyNote',
    LINK: 'Link'
  }
}

export interface λGlyph {
  id: μ.Glyph;
  // base64 image representation
  img: string,
  name: Icon.Name
}

export interface λGroup {
  [key: string]: any
}