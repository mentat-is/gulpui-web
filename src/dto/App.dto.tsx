import { λOperation } from ".";
import { Bucket } from "./QueryMaxMin.dto";
import { λEvent, DetailedChunkEvent } from "./ChunkEvent.dto";
import { λIndex } from "./Index.dto";
import { λContext } from "./Context.dto";
import { PluginEntity, λPlugin } from "./Plugin.dto";
import { λFile } from "./File.dto";
import { λNote } from "./Note.dto";
import { λLink } from "./Link.dto";
import { generateUUID, Gradients, GradientsMap } from "@/ui/utils";
import { FilterOptions, λFilter, μ } from "@/class/Info";
import { λGlyph } from "./λGlyph.dto";
import { Engine } from "@/class/Engine.dto";

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
    settings: Pick<λFile, 'engine' | 'color'>;
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
    user_id: -1,
    settings: {
      engine: (localStorage.getItem('settings.__engine') || 'default') as Engine.List,
      color: (localStorage.getItem('settings.__color') || GradientsMap.thermal) as Gradients
    }
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
      selected: null,
    },
    notes: [],
    links: [],
    sigma: {},
    glyphs: []
  }
}
