import { λChunk } from '../Chunk.dto'

export interface ChunkType_6 {
  client_id: null
  context: null
  current_src_file: null
  ev_failed: number
  ev_mapping_errors: number
  ev_processed: number
  ev_skipped: number
  files_processed: number
  files_total: number
  id: number
  ingest_errors: {}
  matches_total: number
  operation_id: number
  queries_processed: number
  queries_total: number
  req_id: string
  status: number
  time_created: number
  time_end: number
  time_expire: number
  time_update: number
  type: λChunk.QUERY_RESULT
}
