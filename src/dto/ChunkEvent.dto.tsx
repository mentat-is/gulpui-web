import { μ } from '@/class/Info'
import { λContext, λOperation, λFile } from './Dataset'

export type λDoc = Pick<
  λEvent,
  | '_id'
  | '@timestamp'
  | 'gulp.timestamp'
  | 'gulp.source_id'
  | 'gulp.context_id'
  | 'gulp.operation_id'
>

export interface λEvent {
  _id: μ.Event
  '@timestamp': string;
  'timestamp': number;
  'gulp.operation_id': λOperation['id'];
  'gulp.context_id': λContext['id'];
  'gulp.source_id': λFile['id'];
  'gulp.timestamp': bigint;
  'gulp.event_code': number;
  [key: `${string}.${string}`]: any,
  [key: `${string}.${string}.${string}`]: any
}
