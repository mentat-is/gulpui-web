import { UUID } from "crypto";
import { Engine } from "./Engine.dto";
import { MinMax } from "./QueryMaxMin.dto";

export interface λFile {
  name: string,
  doc_count: number,
  event: MinMax,
  timestamp: MinMax,
  selected?: boolean,
  plugin: string,
  events: string[],
  offset: number,
  color: string,
  engine: Engine,
  uuid: UUID
  _uuid: UUID,
}

export interface RawFile {
  name: string,
  doc_count: number,
  "max_event.code": number,
  "min_event.code": number,
  "min_@timestamp": number,
  "max_@timestamp": number
}