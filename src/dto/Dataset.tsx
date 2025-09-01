import { Color } from '@impactium/types'
import { Range, λUser, μ } from '@/class/Info'
import { Gradients } from '@/ui/utils'
import { Engine } from '@/class/Engine.dto'
import { MinMax } from '@/class/Info'
import { λDoc, λEvent } from './ChunkEvent.dto'
import { Icon } from '@impactium/icons'

export type GulpDataType =
  | 'operation'
  | 'context'
  | 'file'
  | 'link'
  | 'note'
  | 'user'
  | 'highlight'

interface ΞSelectionField {
  selected?: boolean
}

const DEFAULT_OBJECT = {}

type Extendable = Record<string, any>

export type GulpObject<
  T extends typeof μ,
  E extends Extendable = typeof DEFAULT_OBJECT,
> = ΞSelectionField & {
  id: T
  color: Color
  type: GulpDataType
  time_created: number
  time_updated: number
  glyph_id: λGlyph['id']
  name: string
  granted_user_ids: Array<λUser['id']>
  granted_user_group_ids: Array<λGroup['']>
} & E

export interface Selectable {
  selected: boolean;
}

export interface λOperation extends Selectable {
  glyph_id: λGlyph['id']
  granted_user_group_ids: λUser['id'][]
  granted_user_ids: string[]
  id: μ.Operation
  index: string
  name: string
  owner_user_id: λUser['id']
  time_created: number
  time_updated: number
  type: 'operation'
}

export interface λContext extends Selectable {
  operation_id: λOperation['id'],
  color: string,
  id: μ.Context,
  type: 'context',
  owner_user_id: λUser['id'],
  granted_user_ids: λUser['id'][],
  granted_user_group_ids: string[],
  time_created: number,
  time_updated: number,
  glyph_id: λGlyph['id'],
  name: string
}

export interface λFile extends Selectable {
  operation_id: λOperation['id'],
  context_id: λContext['id'],
  plugin: string,
  id: μ.File,
  type: 'source',
  owner_user_id: λUser['id'],
  granted_user_ids: string[],
  granted_user_group_ids: λUser['id'][],
  time_created: number,
  time_updated: number,
  glyph_id: λGlyph['id'],
  name: string
  // Client-only params
  settings: Pick<ΞSettings, 'color' | 'engine' | 'field' | 'offset'>
  pinned: boolean // (false)
  // Enriched  using /query_operation
  timestamp: MinMax
  nanotimestamp: MinMax<bigint>
  total: number
}

export interface ΞSettings {
  color: Gradients
  engine: Engine.List
  offset: number
  field: keyof λEvent
  crosshair: boolean
}

export type λLink = GulpObject<μ.Link, {
  type: 'link'
  owner_user_id: string
  description: string
  operation_id: λOperation['id']
  tags: string[]
  doc_id_from: λEvent['_id']
  doc_ids: λEvent['_id'][]
}>

export type λNote<T extends Extendable = typeof DEFAULT_OBJECT> = GulpObject<
  μ.Note,
  T
> & {
  type: 'note'
  operation_id: λOperation['id']
  tags: string[]
  context_id: λContext['id']
  source_id: λFile['id']
  doc: λDoc
  time_pin: number
  owner_user_id: λUser['id']
  text: string
  edits: Record<string, any>[]
}

export type λHighlight = GulpObject<μ.Highlight, {
  type: 'highlight',
  time_range: Range,
  tags: string[],
  operation_id: λOperation['id'];
  color: string
}>

export enum RequestStatus {
  ONGOING = 'ongoing',
  DONE = 'done',
  FAILED = 'failed',
  CANCELED = 'canceled',
  PENDING = 'pending',
}

export enum RequestPrefix {
  INGESTION = 'ingestion',
  QUERY = 'query',
  ENRICHMENT = 'enrichment'
}

export interface λRequest {
  completed: string
  granted_user_group_ids: λUser['id'][]
  granted_user_ids: λUser['id'][]
  id: μ.Request;
  name: string
  owner_user_id: λUser['id']
  records_failed: number
  records_ingested: number
  records_processed: number
  records_skipped: number
  source_failed: number
  source_processed: number
  source_total: number
  status: RequestStatus
  time_created: number
  time_expire: number
  time_finished: number
  time_updated: number
  type: 'request_stats'
}

export namespace Default {
  export type Object =
    | 'OPERATION'
    | 'CREATE_OPERATION'
    | 'CONTEXT'
    | 'FILE'
    | 'NOTE'
    | 'LINK'
    | 'EVENT'
    | 'SESSION'
    | 'HIGHLIGHT'

  export const Icon: Record<Object, Icon.Name> = {
    OPERATION: 'BookDashed',
    CREATE_OPERATION: 'BookPlus',
    CONTEXT: 'Box',
    EVENT: 'Triangle',
    FILE: 'File',
    NOTE: 'StickyNote',
    LINK: 'Link',
    SESSION: 'FacePlus',
    HIGHLIGHT: 'Status'
  }

  export const Color: Record<Object, string> = {
    OPERATION: '#3399ff',
    CREATE_OPERATION: '#3399ff',
    CONTEXT: '#65b58b',
    FILE: '#c99900',
    NOTE: '#009999',
    LINK: '#c99900',
    EVENT: '#ff408c',
    SESSION: '#ff4d4d',
    HIGHLIGHT: 'blue',
  }
}

// '#a1a1a1', '#3399ff', '#ff4d4d', '#c99900', '#65b58b', '#009999', '#c266ff', '#ff408c'

export interface λGlyph {
  id: μ.Glyph
  img: string
  name: Icon.Name
}

export interface λGroup {
  id: μ.Group
  [key: string]: any
}

export type Version = `${number}.${number}.${number}`;