import { UUID } from "crypto";
import { λEvent, λRawEventMinimized } from "./ChunkEvent.dto";
import { μ } from "@/class/Info";

export type λLink = {
  id: number;
  events: Array<Omit<λEvent, 'event'>>;
  context: string
  data: {
    src: string,
    color: string
    events?: λRawEventMinimized[]
  }
  description: string
  edits: number[]
  file: string
  glyph_id: null | number
  level: number
  name: null | string
  operation_id: number
  owner_user_id: number
  private: boolean
  src_file: string
  tags: null | string[]
  text: null | string
  time_created: number
  time_end: number
  time_start: number
  time_updated: number
  type: number
  _uuid: μ.File
}

export type RawLink = Omit<λLink, 'events'> & {
  events: λRawEventMinimized[]
}