import { UUID } from "crypto";
import { Engine } from "./Engine.dto";
import { MinMax } from "./QueryMaxMin.dto";
import { Gradients } from "@/ui/utils";

export interface λFile {
  name: string,
  doc_count: number,
  event: MinMax,
  timestamp: MinMax,
  selected?: boolean,
  plugin: string,
  events: string[],
  offset: number,
  color: Gradients,
  engine: Engine,
  pinned?: boolean;
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