import { λEvent } from './ChunkEvent.dto';
import { μ } from '@/class/Info';
import { λContext, λOperation, λFile } from './Operation.dto';
import { λGlyph } from './λGlyph.dto';

export type λLink = {
  id: μ.Link;
  events: Array<Omit<λEvent, 'event'>>;
  context: λContext['id']
  data: {
    src: string,
    color: string
    events?: λEvent[]
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
  file_id: λFile['id']
}

export type RawLink = any;