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

export interface ΞxtendedEvent extends ΞEvent {
  'log.file.path': string
  'agent.type': string
  'event.original': string
  'event.sequence': number
  'gulp.unmapped.Provider_Guid': '945A8954-C147-4ACD-923F-40C45405A658'
  'gulp.unmapped.Version': string
  'gulp.unmapped.Level': string
  'gulp.unmapped.Task': string
  'gulp.unmapped.Opcode': string
  'gulp.unmapped.Keywords': string
  'gulp.unmapped.TimeCreated_SystemTime': string
  'winlog.record_id': string
  'gulp.unmapped.Execution_ProcessID': string
  'gulp.unmapped.Execution_ThreadID': string
  'winlog.channel': string
  'winlog.computer_name': string
  'gulp.unmapped.Security_UserID': string
  'gulp.unmapped.updateTitle': string
  'gulp.unmapped.updateGuid': string
  'gulp.unmapped.updateRevisionNumber': string
  'gulp.unmapped.serviceGuid': string
}

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

export interface λExtendedEvent extends λEvent {
  log: {
    file: {
      path: string
    }
  }
  agent: {
    type: string
  }
  event: {
    original: string
    sequence: number
  }
  gulp: {
    unmapped: {
      Provider_Guid: string
      Version: string
      Level: string
      Task: string
      Opcode: string
      Keywords: string
      TimeCreated_SystemTime: string
      Execution_ProcessID: string
      Execution_ThreadID: string
      Security_UserID: string
      updateTitle: string
      updateGuid: string
      updateRevisionNumber: string
      serviceGuid: string
    }
  }
  winlog: {
    record_id: string
    channel: string
    computer_name: string
  }
}
