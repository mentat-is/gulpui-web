import { Hardcode } from '@/class/Engine.dto'
import { μ } from '@/class/Info'
import { UUID } from 'crypto'
import { λContext, λOperation, λFile } from './Dataset'

export interface ΞEvent {
  '@timestamp': number
  'event.code': string
  'event.duration': number
  'gulp.context_id': λContext['id']
  'gulp.event_code': number
  'gulp.operation_id': λOperation['id']
  'gulp.source_id': λFile['id']
  'gulp.timestamp': number
  'gulp.timestamp_invalid': boolean
  _id: λEvent['id']
}

export interface λEvent {
  id: μ.Event;
  operation_id: λOperation['id'];
  context_id: λContext['id']
  file_id: λFile['id']
  timestamp: number;
  nanotimestamp: number;
  // event.event_code
  code: string,
  // event.gulp.event_code
  weight: number,
  duration: number
}

export type DetailedChunkEvent = any;
