import { λOperation } from '.'
import { λEvent } from './ChunkEvent.dto'
import { generateUUID } from '@/ui/utils'
import {
  FilterOptions,
  GulpDataset,
  Internal,
  MinMax,
  λFilter,
  λQuery,
  λUser,
  μ,
} from '@/class/Info'
import { λContext, λFile, λGlyph, λHighlight, λLink, λNote, λRequest } from './Dataset'
import { λMapping } from './MappingFileList.dto'
import { Pointers } from '@/components/Pointers'

export interface TimelineTarget {
  event: λEvent
  detailed: λEvent | null
}

export interface λApp {
  target: {
    operations: λOperation[]
    contexts: λContext[]
    files: λFile[]
    events: Map<λFile['id'], λEvent[]>
    filters: Record<λFile['id'], λQuery>
    notes: λNote[]
    links: λLink[]
    highlights: λHighlight[]
    glyphs: λGlyph[]
    mappings: λMapping.Plugin[]
    plugins: GulpDataset.PluginList.Interface[]
  }
  general: {
    server: string
    ws_id: string
    glyphs_syncronized: boolean
    requests: λRequest[]
    user: λUser | null
    loadings: {
      byRequestId: Map<λRequest['id'], λFile['id']>;
      byFileId: Map<λFile['id'], λRequest['id']>;
    }
  }
  timeline: {
    scale: number
    frame: MinMax
    target: λEvent | null
    filter: string
    cache: {
      data: Map<μ.File, λEvent[]>
      filters: Record<λFile['id'], λQuery>
    }
    isScrollReversed: boolean
    dialogSize: number
    pointers: Pointers.Pointer[]
  },
  settings: {
    [key: string]: any;
  },
  hidden: {
    notes: boolean;
    links: boolean;
  }
}
export const BaseInfo: λApp = {
  general: {
    server: Internal.Settings.server,
    ws_id: generateUUID(),
    glyphs_syncronized: false,
    requests: [],
    user: null,
    loadings: {
      byRequestId: new Map(),
      byFileId: new Map(),
    }
  },
  timeline: {
    scale: 1,
    target: null,
    filter: '',
    cache: {
      data: new Map<μ.File, λEvent[]>(),
      filters: {},
    },
    frame: {
      min: 0,
      max: Date.now(),
    },
    isScrollReversed: localStorage.getItem('settings.__isScrollReversed') === 'true',
    dialogSize: window.innerWidth / 3,
    pointers: [],
  },
  target: {
    operations: [],
    contexts: [],
    files: [],
    events: new Map<μ.File, λEvent[]>(),
    filters: {},
    notes: [],
    links: [],
    highlights: [],
    glyphs: [],
    mappings: [],
    plugins: [],
  },
  settings: {},
  hidden: {
    notes: false,
    links: false
  }
}

