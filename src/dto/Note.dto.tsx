import { λEvent, λRawEventMinimized } from "./ChunkEvent.dto"
import { μ } from "@/class/Info"
import { λContext, λOperation, λFile } from "./Operation.dto"
import { λGlyph } from "./λGlyph.dto"
import { Color } from "@impactium/types"

export interface λNote {
  file_id: λFile['id'],
  id: μ.Note,
  level: 0 | 1 | 2,
  owner_user_id: number,
  type: number,
  time_created: number,
  time_updated: number,
  time_start: number,
  time_end: null | number,
  operation_id: λOperation['id'],
  context: λContext['id'],
  name: string,
  description: null | string,
  text: string,
  glyph_id: λGlyph['id'],
  tags?: string[],
  events: λEvent[],
  data: {
    color: Color
  },
  edits: number[],
  private: boolean
}

export interface RawNote extends Omit<λNote, 'file' | 'events' | 'uuid'> {
  src_file: string
  events: λRawEventMinimized[]
}