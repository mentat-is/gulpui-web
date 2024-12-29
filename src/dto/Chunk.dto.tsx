import { ChunkType_6 } from './chunk/6.dto';
import { λEvent, RawChunkEvent } from './ChunkEvent.dto';

export enum λChunk {
  INGESTION_STATS_CREATE = 1,
  INGESTION_STATS_UPDATE = 2,
  COLLAB_CREATE = 3,
  COLLAB_UPDATE = 4,
  COLLAB_DELETE = 5,
  QUERY_RESULT = 6,
  QUERY_DONE = 7,
  SIGMA_GROUP_RESULT = 8,
  INGESTION_CHUNK = 9,
  QUERY_STATS_CREATE = 10,
  QUERY_STATS_UPDATE = 11
};

export type UnknownChunk = ChunkType_6 | Chunk | DoneChunk

export type UnknownRawChunk = ChunkType_6 | RawChunk

export interface Chunk {
  aggregations: null
  chunk: number
  error: null
  events: λEvent[]
  query_dsl: null
  query_glyph_id: null
  query_name: string
  query_sigma_text: null
  req_id: string
  search_after: [number, string]
  sigma_rule_file: null
  sigma_rule_id: null
  stored_query_id: null
  total_hits: number
  type: λChunk
}

export interface RawChunk extends Omit<Chunk, 'events'> {
  events: RawChunkEvent[]
}

export interface DoneChunk {
  type: λChunk.QUERY_DONE
  data: {
    status: number,
    combined_total_hit: number
  },
  req_id: string,
  username: string,
  timestamp: number,
  operation_id: number,
  client_id: number,
  ws_id: string
}

export const isChunkType_6 = (chunk: UnknownRawChunk): chunk is ChunkType_6 => 'type' in chunk && chunk.type === 6;

export const isChunkDefault = (chunk: UnknownRawChunk): chunk is RawChunk => 'events' in chunk && !!chunk.events.length;