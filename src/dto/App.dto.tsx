import { λOperation } from '.';
import { λEvent, λExtendedEvent } from './ChunkEvent.dto';
import { λIndex } from './Index.dto';
import { generateUUID } from '@/ui/utils';
import { FilterOptions, MinMax, λFilter, λUser, μ } from '@/class/Info';
import { Engine } from '@/class/Engine.dto';
import { XY } from './XY.dto';
import { λContext, λFile, λGlyph, λLink, λNote } from './Dataset';
import { λMapping } from './MappingFileList.dto';

export interface TimelineTarget {
  event: λEvent, 
  detailed: λExtendedEvent | null;
};

export interface λApp {
  target: {
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
    plugins: λMapping.Plugin[]
  }
  general: λUser & {
    server: string;
    ws_id: string;
    sessions: Record<string, Session>;
    glyphs_syncronized: boolean;
  },
  timeline: {
    scale: number;
    frame: MinMax;
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
  general: {
    server: 'http://localhost:8080',
    ws_id: generateUUID(),
    id: '',
    time_expire: Infinity,
    token: '',
    sessions: {},
    glyphs_syncronized: false
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
    frame: {
      min: 0,
      max: 0
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
    notes: [],
    links: [],
    sigma: {},
    glyphs: [],
    plugins: []
  }
}

export interface Session {
  render: Array<{ filename: string, context: string, engine: Engine.List, selected: boolean }>;
  scroll: XY;
}