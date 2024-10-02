import { UUID } from "crypto"
import { λEvent, λRawEventMinimized } from "./ChunkEvent.dto"

export interface λNote {
  _uuid: UUID,
  id: number,
  level: number,
  owner_user_id: number,
  type: number,
  time_created: number,
  time_updated: number,
  time_start: number,
  time_end: null | number,
  operation_id: number,
  context: string,
  file: string,
  name: string,
  description: null | string,
  text: string,
  glyph_id: null | number,
  tags: string[],
  events: λEvent[],
  data: {
      color: string
  },
  edits: number[],
  private: boolean
}

export interface RawNote extends Omit<λNote, 'file' | 'events' | 'uuid'> {
  src_file: string
  events: λRawEventMinimized[]
}