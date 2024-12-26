import { Login, λOperation } from ".";
import { Bucket } from "./QueryMaxMin.dto";
import { λEvent, DetailedChunkEvent } from "./ChunkEvent.dto";
import { λIndex } from "./Index.dto";
import { λPlugin } from "./Plugin.dto";
import { λNote } from "./Note.dto";
import { λLink } from "./Link.dto";
import { generateUUID, Gradients, GradientsMap } from "@/ui/utils";
import { FilterOptions, λFilter, μ } from "@/class/Info";
import { λGlyph } from "./λGlyph.dto";
import { Engine } from "@/class/Engine.dto";
import { RenderEngine } from "@/class/RenderEngine";
import { XY } from "./XY.dto";
import { λContext, λFile } from "./Operation.dto";

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
    files: λFile[],
    events: Map<λFile['id'], λEvent[]>
    filters: Record<λFile['id'], λFilter[]>;
    notes: λNote[],
    links: λLink[],
    glyphs: λGlyph[],
    sigma: Record<λFile['id'], {
      name: string;
      content: string;
    }>;
  }
  general: Login & {
    server: string;
    password: string;
    ws_id: string;
    plugins: λPlugin[];
    settings: λFile['settings'];
    sessions: Record<string, Session>
  },
  timeline: {
    scale: number;
    target: λEvent | null;
    loaded: μ.File[];
    filter: string;
    cache: {
      data: Map<μ.File, λEvent[]>;
      filters: Record<λFile['id'], λFilter[]>;
    },
    filtering_options: Record<μ.File, FilterOptions>;
    isScrollReversed: boolean;
    dialogSize: number;
  }
}
export const BaseInfo: λApp = {
  transfered: {
    down: 0,
    up: 0
  },
  general: {
    server: 'http://localhost:8080',
    password: 'admin',
    ws_id: generateUUID(),
    plugins: [],
    id: '',
    time_expire: Infinity,
    token: '',
    settings: {
      engine: (localStorage.getItem('settings.__engine') || 'default') as Engine.List,
      color: (localStorage.getItem('settings.__color') || 'thermal') as Gradients,
      offset: 0,
      focusField: ''
    },
    sessions: {}
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
    isScrollReversed: localStorage.getItem('settings.__isScrollReversed') === 'true',
    dialogSize: 50
  },
  target: {
    indexes: [],
    operations: [],
    contexts: [],
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

export interface Session {
  render: Array<{ filename: string, context: string, engine: Engine.List, selected: boolean }>;
  scroll: XY;
}