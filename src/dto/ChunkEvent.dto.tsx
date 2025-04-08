import { μ } from '@/class/Info'
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

export type ΞDoc = Pick<
  ΞEvent,
  | '_id'
  | '@timestamp'
  | 'gulp.timestamp'
  | 'gulp.source_id'
  | 'gulp.context_id'
  | 'gulp.operation_id'
>

export type λDoc = Pick<
  λEvent,
  | 'id'
  | 'timestamp'
  | 'nanotimestamp'
  | 'context_id'
  | 'file_id'
  | 'operation_id'
>

export interface λEvent {
  id: μ.Event
  operation_id: λOperation['id']
  context_id: λContext['id']
  file_id: λFile['id']
  timestamp: number
  nanotimestamp: bigint
  code: string
  weight: number
  duration: number
}
