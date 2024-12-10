import { MinMax } from "./QueryMaxMin.dto";
import { Gradients } from "@/ui/utils";
import { μ } from "@/class/Info";
import { Engine } from "@/class/Engine.dto";
import { λEvent } from "./ChunkEvent.dto";

export interface λFile {
  name: string,
  doc_count: number,
  event: MinMax,
  timestamp: MinMax,
  selected?: boolean,
  plugin: string,
  offset: number,
  color: Gradients,
  engine: Engine.List,
  pinned?: boolean;
  key: keyof λEvent | null;
  uuid: μ.File,
  _uuid: μ.Plugin,
}

export interface RawFile {
  name: string,
  doc_count: number,
  "max_event.code": number,
  "min_event.code": number,
  "min_@timestamp": number,
  "max_@timestamp": number
}