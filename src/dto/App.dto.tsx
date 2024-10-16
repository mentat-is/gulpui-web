import { λOperation } from ".";
import { Bucket } from "./QueryMaxMin.dto";
import { λEvent, DetailedChunkEvent } from "./ChunkEvent.dto";
import { λIndex } from "./Index.dto";
import { λContext } from "./Context.dto";
import { PluginEntity, λPlugin } from "./Plugin.dto";
import { λFile } from "./File.dto";
import { λNote } from "./Note.dto";
import { λLink } from "./Link.dto";
import { generateUUID } from "@/ui/utils";
import { UUID } from "crypto";
import { GulpQueryFilterArray } from "@/class/Info";

export interface TimelineTarget {
  event: λEvent, 
  detailed: DetailedChunkEvent | null;
};

export interface λApp {
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
  }
  general: {
    server: string;
    username: string;
    user_id: number;
    password: string;
    ws_id: string;
    token?: string;
    expires?: number;
    ingest: PluginEntity[];
  },
  timeline: {
    scale: number;
    target: λEvent | null;
    loaded: UUID[];
    filter: string;
  }
}
export const BaseInfo: λApp = {
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
    loaded: [],
    filter: ''
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
  }
}
