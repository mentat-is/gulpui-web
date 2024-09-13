import { ChunkType_6 } from "./chunk/6.dto";
import { λEvent, RawChunkEvent } from "./ChunkEvent.dto";

export type UnknownChunk = ChunkType_6 | Chunk

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
  req_id: "39435d4d-aa37-4ec9-b81c-73703f9296a2"
  search_after: [number, string]
  sigma_rule_file: null
  sigma_rule_id: null
  stored_query_id: null
  total_hits: number
}

export interface RawChunk extends Omit<Chunk, 'events'> {
  events: RawChunkEvent[]
}

export const isChunkType_6 = (chunk: UnknownRawChunk): chunk is ChunkType_6 => 'type' in chunk && chunk.type === 6;

export const isChunkDefault = (chunk: UnknownRawChunk): chunk is RawChunk => 'events' in chunk && !!chunk.events.length;
