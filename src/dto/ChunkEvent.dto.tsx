import { Hardcode } from '@/class/Engine.dto'
import { μ } from '@/class/Info'
import { UUID } from 'crypto'
import { λContext, λOperation, λFile } from './Operation.dto'

export interface λEvent {
  id: μ.Event;
  operation_id: λOperation['id']
  timestamp: Hardcode.Timestamp
  event: {
    code: string,
    duration: number
  },
  pos?: number
  context: λContext['id']
  file_id: λFile['id']
}

export interface DetailedChunkEvent extends λEvent {
  operation: string;
  agent: {
    type: string;
    id: string
  },
  event: {
    code: string,
    duration: number
    id: string;
    hash: string;
    category: string;
    original: string;
  },
  level: number
}

export interface RawChunkEvent {
  _id: string
  operation_id: number
  '@timestamp': number
  'gulp.event.code': string
  'event.duration': number
  // λFile
  'gulp.file.file': string
  // λContext
  'gulp.context': string
}

export interface RawDetailedChunkEvent extends RawChunkEvent {
  'operation': λOperation['id'],
  '@timestamp': number,
  'gulp.context': λContext['id'],
  'agent.type': string,
  'log.level': number,
  'gulp.file.file': λFile['id'],
  'agent.id': string,
  'event.id': string,
  'event.category': string,
  'event.code': string,
  'event.duration': number,
  'event.hash': string,
  'event.original': string,
  '_id': string
}

export type λRawEventMinimized = Pick<λEvent, 'context' | 'id' | 'operation_id'> & {
  '@timestamp': number
  src_file: λFile['id'];
}

export interface λEventFormForCreateRequest {
  id: string;
  timestamp: number;
  operation_id: number;
  context: string;
  src_file: string;
}