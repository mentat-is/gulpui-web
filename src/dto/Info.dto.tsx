import { λOperation } from "../dto";
import { Bucket } from "./QueryMaxMin.dto";
import { λEvent, DetailedChunkEvent } from "./ChunkEvent.dto";
import { λIndex } from "./Index.dto";
import { GulpQueryFilterArray } from "./GulpGueryFilter.class";
import { λContext } from "./Context.dto";
import { PluginEntity, λPlugin } from "./Plugin.dto";
import { λFile } from "./File.dto";
import { λNote } from "./Note.dto";
import { λLink } from "./Link.dto";
import { IngestMapping } from "./Ingest.dto";
import { generateUUID } from "@/ui/utils";
import { UUID } from "crypto";

export interface TimelineTarget {
  event: λEvent, 
  detailed: DetailedChunkEvent | null;
};

export interface Info {
  transfered: {
    down: number,
    up: number
  }; // bytes
  target: {
    bucket: Bucket,
    indexes: λIndex[]
    operations: λOperation[],
    contexts: λContext[],
    plugins: λPlugin[],
    files: λFile[],
    events: Map<UUID, λEvent[]>
    filters: Record<UUID, GulpQueryFilterArray>;
    notes: λNote[],
    links: λLink[],
    plugins_map: PluginEntity[]
  }
  general: {
    server: string;
    username: string;
    user_id: number;
    password: string;
    ws_id: string;
    token?: string;
    expires?: number;
    ingest: IngestMapping;
  },
  timeline: {
    scale: number;
    target: λEvent | null;
  }
}
export const BaseInfo: Info = {
  transfered: {
    down: 0,
    up: 0
  },
  general: {
    server: 'http://localhost:8080',
    username: 'admin',
    password: 'admin',
    ws_id: generateUUID(),
    ingest: [],
    user_id: -1
  },
  timeline: {
    scale: 1,
    target: null,
  },
  target: {
    indexes: [],
    operations: [],
    contexts: [],
    plugins: [],
    files: [],
    events: new Map(),
    filters: {},
    bucket: {
      total: 0,
      fetched: 0,
      event_code: {
        min: 0,
        max: 0
      },
      timestamp: {
        min: 0,
        max: 0
      },
      selected: {
        min: 0,
        max: 0
      }
    },
    notes: [],
    links: [],
    plugins_map: []
  }
}
