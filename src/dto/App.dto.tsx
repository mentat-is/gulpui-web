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
import { FilterOptions, λFilter, μ } from "@/class/Info";
import { λGlyph } from "./λGlyph.dto";

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
    events: Map<μ.File, λEvent[]>
    filters: Record<μ.File, λFilter[]>;
    notes: λNote[],
    links: λLink[],
    glyphs: λGlyph[],
    sigma: Record<μ.File, {
      name: string;
      content: string;
    }>;
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
    loaded: μ.File[];
    filter: string;
    cache: {
      data: Map<μ.File, λEvent[]>;
      filters: Record<μ.File, λFilter[]>;
    },
    filtering_options: Record<μ.File, FilterOptions>;
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
    filter: '',
    cache: {
      data: new Map<μ.File, λEvent[]>(),
      filters: {}
    },
    filtering_options: {},
  },
  target: {
    indexes: [],
    operations: [],
    contexts: [],
    plugins: [],
    files: [],
    events: new Map<μ.File, λEvent[]>(),
    filters: {},
    bucket: {
      total: 0,
      fetched: 0,
      event_code: {
        min: 0,
        max: 0
      },
      timestamp: {
        min: Date.now(),
        max: Date.now()
      },
      selected: {
        min: Date.now(),
        max: Date.now()
      }
    },
    notes: [],
    links: [],
    sigma: {},
    glyphs: []
  }
}
