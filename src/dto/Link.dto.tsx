import { UUID } from "crypto";
import { λEvent, λRawEventMinimized } from "./ChunkEvent.dto";
import { μ } from "@/class/Info";
import { λContext, λOperation, λSource } from "./Operation.dto";
import { λGlyph } from "./λGlyph.dto";

export type λLink = {
  id: μ.Link;
  events: Array<Omit<λEvent, 'event'>>;
  context: λContext['id']
  data: {
    src: string,
    color: string
    events?: λRawEventMinimized[]
  }
  description: string
  edits: number[]
  glyph_id: λGlyph['id']
  level: number
  name: null | string
  operation_id: λOperation['id']
  owner_user_id: number
  private: boolean
  tags: null | string[]
  text: null | string
  time_created: number
  time_end: number
  time_start: number
  time_updated: number
  type: number
  source_id: λSource['id']
}

export type RawLink = any;