import { μ } from "@/class/Info"
import { UUID } from "crypto"

export interface λEvent {
  _id: string
  operation_id: number
  timestamp: number
  event: {
    code: string,
    duration: number
  },
  file: string
  context: string
  pos?: number
  _uuid: μ.File
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
  'gulp.source.file': string
  // λContext
  'gulp.context': string
}

export interface RawDetailedChunkEvent extends RawChunkEvent {
  "operation": string,
  "@timestamp": number,
  "gulp.context": string,
  "agent.type": string,
  "log.level": number,
  "gulp.source.file": string,
  "agent.id": string,
  "event.id": string,
  "event.category": string,
  "event.code": string,
  "event.duration": number,
  "event.hash": string,
  "event.original": string,
  "_id": string
}

export interface λRawEventMinimized {
  '@timestamp': number
  context: string | null;
  id: string
  operation_id: number | null;
  src_file: string | null;
}

export interface λEventFormForCreateRequest {
  id: string;
  timestamp: number;
  operation_id: number;
  context: string;
  src_file: string;
}