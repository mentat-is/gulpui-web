import { MinMax } from '@/class/Info'
import { RulerDrawer } from '@/class/Ruler.drawer'
import { Pointers } from '@/components/Pointers'
import { App } from '@/entities/App'
import { Color } from '@/entities/Color'
import { Doc } from '@/entities/Doc'
import { Glyph } from '@/entities/Glyph'
import { Link } from '@/entities/Link'
import { Note } from '@/entities/Note'
import { Operation } from '@/entities/Operation'
import { Source } from '@/entities/Source'
import { getCanvasIcon } from '@/ui/CanvasIcon'
import { numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine, formatTimestampToReadableString, stringToHexColor } from '@/ui/utils'
import { createTimelineProjector, clusterEventsToColumns, findIndexWindowDescending, findVisibleWindowDescending, TimelineProjector, EventColumn } from './geometry'

const ROW_HEIGHT = 48
const NOTE_SIZE = 32
const LINK_BADGE_SIZE = 24
const EVENT_OVERSCAN = 48
const HIT_BUCKET = 64

export interface CanvasLayers {
  composite: HTMLCanvasElement
  background: HTMLCanvasElement
  events: HTMLCanvasElement
  links: HTMLCanvasElement
  notes: HTMLCanvasElement
  pointers: HTMLCanvasElement
}

export interface ViewportPoint {
  x: number
  y: number
}

export interface PointerLayerState {
  self: ViewportPoint
  timestamp: number
  peers: Pointers.Pointer[]
}

export interface TimelineRenderState {
  app: App.Type
  width: number
  height: number
  scale: number
  frame: MinMax
  scrollX: number
  scrollY: number
  hover: ViewportPoint | null
  pointer: PointerLayerState
  highlights: Array<[number, number, number, string]>
  composeComposite?: boolean
}

export type TimelineHit =
  | { type: 'event'; source: Source.Type; events: Doc.Type[] }
  | { type: 'note'; notes: Note.Type[] }
  | { type: 'link'; link: Link.Type }

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface EventHitRegion {
  rect: Rect
  sourceId: Source.Id
  start: number
  end: number
}

interface NoteHitRegion {
  rect: Rect
  notes: Note.Type[]
  sourceId: Source.Id
}

interface LinkHitRegion {
  rect: Rect
  link: Link.Type
}

interface SourceMetaCache {
  signature: string
  range: MinMax
}

interface NoteGroupCache {
  signature: string
  scale: number
  groups: Array<{ index: number; count: number }>
  notes: Note.Type[]
}

interface SortedNoteCache {
  signature: string
  notes: Note.Type[]
}

interface RendererSnapshot {
  width: number
  height: number
  scrollX: number
  scrollY: number
  scale: number
  frameMin: number
  frameMax: number
  sourceOrder: string
  sourceDataKey: string
  notesKey: string
  linksKey: string
  themeKey: string
}

export class LayeredTimelineRenderer {
  private static instance: LayeredTimelineRenderer | null = null

  public static getInstance() {
    if (!LayeredTimelineRenderer.instance) {
      LayeredTimelineRenderer.instance = new LayeredTimelineRenderer()
    }

    return LayeredTimelineRenderer.instance
  }

  public noteHits: NoteHitRegion[] = []
  public linkHits: LinkHitRegion[] = []
  public eventHits: EventHitRegion[] = []

  private layers: CanvasLayers | null = null
  private sourceMeta = new Map<Source.Id, SourceMetaCache>()
  private noteGroups = new Map<Source.Id, NoteGroupCache>()
  private sortedNotes = new Map<Source.Id, SortedNoteCache>()
  private eventHitBuckets = new Map<string, EventHitRegion[]>()
  private noteHitBuckets = new Map<string, NoteHitRegion[]>()
  private linkHitBuckets = new Map<string, LinkHitRegion[]>()
  private lastState: RendererSnapshot | null = null
  private scratchLayers = new Map<string, HTMLCanvasElement>()

  private constructor() { }

  public attachLayers(layers: CanvasLayers) {
    this.layers = layers
  }

  public resize(width: number, height: number) {
    if (!this.layers) {
      return
    }

    for (const layer of Object.values(this.layers)) {
      if (layer.width !== width) {
        layer.width = width
      }
      if (layer.height !== height) {
        layer.height = height
      }
    }
  }

  public clearAllCaches() {
    this.sourceMeta.clear()
    this.noteGroups.clear()
    this.sortedNotes.clear()
    this.noteHits = []
    this.linkHits = []
    this.eventHits = []
    this.eventHitBuckets.clear()
    this.noteHitBuckets.clear()
    this.linkHitBuckets.clear()
    this.lastState = null
  }

  public reset(key: 'notes' | 'range' | 'flags') {
    if (key === 'notes') {
      this.noteGroups.clear()
      this.sortedNotes.clear()
      this.noteHits = []
      this.noteHitBuckets.clear()
      return
    }
    if (key === 'range') {
      this.sourceMeta.clear()
      this.eventHits = []
      this.eventHitBuckets.clear()
      return
    }
  }

  public render(state: TimelineRenderState) {
    if (!this.layers) {
      return
    }

    this.resize(state.width, state.height)

    const selectedSources = Source.Entity.selected(state.app)
    const projector = createTimelineProjector(state.frame, state.width, state.scale, state.scrollX)
    const themeKey = JSON.stringify(Color.Themer.theme)
    const sourceOrder = selectedSources.map(source => source.id).join(',')
    const sourceDataKey = selectedSources.map(source => {
      const events = Source.Entity.events(state.app, source)
      return `${source.id}:${events.length}:${events[0]?._id || 'none'}:${events[events.length - 1]?._id || 'none'}:${source.settings.render_engine}:${source.settings.field}:${source.settings.offset}`
    }).join('|')
    const notesKey = `${state.app.hidden.notes}:${state.app.target.notes.length}:${state.app.target.notes[0]?.id || 'none'}:${state.app.target.notes[state.app.target.notes.length - 1]?.id || 'none'}`
    const linksKey = `${state.app.hidden.links}:${state.app.target.links.length}:${state.app.target.links[0]?.id || 'none'}:${state.app.target.links[state.app.target.links.length - 1]?.id || 'none'}`

    const viewportChanged = !this.lastState ||
      this.lastState.width !== state.width ||
      this.lastState.height !== state.height ||
      this.lastState.scrollX !== state.scrollX ||
      this.lastState.scrollY !== state.scrollY ||
      this.lastState.scale !== state.scale ||
      this.lastState.frameMin !== state.frame.min ||
      this.lastState.frameMax !== state.frame.max ||
      this.lastState.sourceOrder !== sourceOrder

    const sourceDataChanged = !this.lastState || this.lastState.sourceDataKey !== sourceDataKey
    const notesChanged = !this.lastState || this.lastState.notesKey !== notesKey
    const linksChanged = !this.lastState || this.lastState.linksKey !== linksKey
    const themeChanged = !this.lastState || this.lastState.themeKey !== themeKey
    const horizontalPanOnly = Boolean(
      this.lastState &&
      this.lastState.scrollX !== state.scrollX &&
      this.lastState.scrollY === state.scrollY &&
      this.lastState.scale === state.scale &&
      this.lastState.frameMin === state.frame.min &&
      this.lastState.frameMax === state.frame.max &&
      this.lastState.width === state.width &&
      this.lastState.height === state.height &&
      this.lastState.sourceOrder === sourceOrder
    )

    if (viewportChanged || themeChanged) {
      this.renderBackgroundLayer(state, projector, themeKey)
    }
    if (viewportChanged || sourceDataChanged) {
      this.renderEventsLayer(state, projector, selectedSources, horizontalPanOnly && !sourceDataChanged)
    }
    if (viewportChanged || notesChanged) {
      this.renderNotesLayer(state, projector, selectedSources, horizontalPanOnly && !notesChanged)
    }
    if (viewportChanged || linksChanged) {
      this.renderLinksLayer(state, projector, selectedSources, horizontalPanOnly && !linksChanged)
    }
    this.renderPointersLayer(state, projector, selectedSources)
    if (state.composeComposite) {
      this.composeLayers(state.width, state.height)
    }

    this.lastState = {
      width: state.width,
      height: state.height,
      scrollX: state.scrollX,
      scrollY: state.scrollY,
      scale: state.scale,
      frameMin: state.frame.min,
      frameMax: state.frame.max,
      sourceOrder,
      sourceDataKey,
      notesKey,
      linksKey,
      themeKey
    }
  }

  public hitTest(app: App.Type, point: ViewportPoint): TimelineHit | null {
    const linkCandidates = this.linkHitBuckets.get(bucketKey(point.x, point.y)) || this.linkHits
    for (const hit of linkCandidates) {
      if (isInside(hit.rect, point)) {
        return { type: 'link', link: hit.link }
      }
    }

    const noteCandidates = this.noteHitBuckets.get(bucketKey(point.x, point.y)) || this.noteHits
    for (const hit of noteCandidates) {
      if (isInside(hit.rect, point)) {
        return { type: 'note', notes: hit.notes }
      }
    }

    const eventCandidates = this.eventHitBuckets.get(bucketKey(point.x, point.y)) || this.eventHits
    for (const hit of eventCandidates) {
      if (isInside(hit.rect, point)) {
        const source = Source.Entity.id(app, hit.sourceId)
        if (!source) {
          return null
        }
        const events = Source.Entity.events(app, source).slice(hit.start, hit.end + 1)
        return { type: 'event', source, events }
      }
    }

    return null
  }

  public getNotesByX(app: App.Type, file: Source.Type, x: number): Note.Type[] {
    let best: NoteHitRegion | null = null
    let bestDistance = Infinity
    for (const hit of this.noteHits) {
      if (hit.sourceId !== file.id) {
        continue
      }
      const distance = Math.abs((hit.rect.x + hit.rect.w / 2) - x)
      if (distance < bestDistance) {
        bestDistance = distance
        best = hit
      }
    }

    return best?.notes ?? []
  }

  private renderBackgroundLayer(state: TimelineRenderState, projector: TimelineProjector, themeKey: string) {
    if (!this.layers) {
      return
    }

    const ctx = this.layers.background.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, state.width, state.height)

    const ruler = new RulerDrawer({
      ctx,
      getPixelPosition: projector.xForTimestamp,
      scrollX: state.scrollX,
      scale: state.scale,
      selected: state.frame,
      width: projector.worldWidth
    })
    ruler.draw()
    ruler.sections()

    state.highlights.forEach(([x, width, index, color]) => {
      ctx.fillStyle = `${stringToHexColor(`${color}-${index}`)}22`
      const y = 32 * (index + 1)
      const height = Math.max(0, state.height - (20 * 2 * (index + 1)))
      ctx.fillRect(x, y, width, height)
    })

  }

  private renderEventsLayer(state: TimelineRenderState, projector: TimelineProjector, sources: Source.Type[], allowShift: boolean) {
    if (!this.layers) {
      return
    }

    const ctx = this.layers.events.getContext('2d')
    if (!ctx) {
      return
    }

    const fullRedraw = !this.lastState ||
      this.lastState.width !== state.width ||
      this.lastState.height !== state.height ||
      this.lastState.scale !== state.scale ||
      this.lastState.scrollY !== state.scrollY ||
      this.lastState.frameMin !== state.frame.min ||
      this.lastState.frameMax !== state.frame.max ||
      this.lastState.sourceOrder !== sources.map(source => source.id).join(',')

    this.eventHits = []
    this.eventHitBuckets.clear()

    if (!fullRedraw && this.lastState && this.lastState.scrollX !== state.scrollX && allowShift) {
      this.shiftLayer('events', this.lastState.scrollX - state.scrollX)
    } else {
      ctx.clearRect(0, 0, state.width, state.height)
    }

    const redrawRegion = fullRedraw || !this.lastState
      ? { startX: 0, endX: state.width }
      : exposedStrip(state.width, this.lastState.scrollX - state.scrollX)

    for (let index = 0; index < sources.length; index++) {
      const source = sources[index]
      const rowY = index * ROW_HEIGHT - state.scrollY

      if (rowY < -ROW_HEIGHT || rowY > state.height + ROW_HEIGHT) {
        continue
      }

      this.drawSourceRow(ctx, state, projector, source, rowY, redrawRegion.startX, redrawRegion.endX)
    }

    this.drawSelectionFrame(ctx, state, projector)
    this.drawTargetCrosshair(ctx, state, projector, sources)
    this.drawFlaggedDocuments(ctx, state, projector, sources)
  }

  private drawSourceRow(
    ctx: CanvasRenderingContext2D,
    state: TimelineRenderState,
    projector: TimelineProjector,
    source: Source.Type,
    rowY: number,
    startX: number,
    endX: number
  ) {
    const color = stringToHexColor(source.context_id)
    ctx.clearRect(startX, rowY - 24, endX - startX, ROW_HEIGHT)
    ctx.fillStyle = `${color}${source.pinned ? '18' : '10'}`
    ctx.fillRect(startX, rowY - 24, endX - startX, ROW_HEIGHT)
    ctx.fillStyle = color
    ctx.fillRect(startX, rowY + 23, endX - startX, 1)

    const events = Source.Entity.events(state.app, source)
    if (events.length === 0) {
      this.drawSourceInfo(ctx, state, projector, source, rowY)
      return
    }

    const minVisible = projector.timestampForX(startX - EVENT_OVERSCAN) - (source.settings.offset || 0)
    const maxVisible = projector.timestampForX(endX + EVENT_OVERSCAN) - (source.settings.offset || 0)
    const visible = findVisibleWindowDescending(events, minVisible, maxVisible)

    if (!visible) {
      this.drawSourceInfo(ctx, state, projector, source, rowY)
      return
    }

    const columns = clusterEventsToColumns(events, source, projector, visible)
    const range = this.getSourceRange(source, events)
    const maxColumnCount = columns.reduce((max, column) => Math.max(max, column.count), 1)

    if (source.settings.render_engine === 'graph') {
      this.drawGraphColumns(ctx, source, columns, range, rowY, maxColumnCount)
    } else if (source.settings.render_engine === 'height') {
      this.drawHeightColumns(ctx, source, columns, range, rowY, maxColumnCount)
    } else {
      this.drawDefaultColumns(ctx, source, columns, range, rowY)
    }

    columns.forEach(column => {
      const region = {
        rect: { x: column.x - 2, y: rowY - 24, w: 5, h: ROW_HEIGHT },
        sourceId: source.id,
        start: column.start,
        end: column.end
      }
      this.eventHits.push(region)
      this.indexHitRegion(this.eventHitBuckets, region)
    })

    this.drawSourceBounds(ctx, state, projector, source, rowY)
    this.drawSourceInfo(ctx, state, projector, source, rowY)
  }

  private drawDefaultColumns(ctx: CanvasRenderingContext2D, source: Source.Type, columns: EventColumn[], range: MinMax, rowY: number) {
    for (const column of columns) {
      const opacity = Math.min(1, 0.2 + (Math.log2(column.count + 1) / 6))
      const color = getEventColor(source, column.maxValue, range)
      ctx.fillStyle = withAlpha(color, opacity)
      ctx.fillRect(column.x, rowY - 24, 1, 47)
    }
  }

  private drawHeightColumns(ctx: CanvasRenderingContext2D, source: Source.Type, columns: EventColumn[], range: MinMax, rowY: number, maxColumnCount: number) {
    for (const column of columns) {
      const color = getEventColor(source, column.maxValue, range)
      const height = Math.max(1, Math.round((column.count / maxColumnCount) * 46))
      ctx.fillStyle = color
      ctx.fillRect(column.x, rowY + 23, 1, -height)
    }
  }

  private drawGraphColumns(ctx: CanvasRenderingContext2D, source: Source.Type, columns: EventColumn[], range: MinMax, rowY: number, maxColumnCount: number) {
    let previous: { x: number; y: number; color: string } | null = null

    for (const column of columns) {
      const color = getEventColor(source, column.maxValue, range)
      const y = rowY + 22 - Math.round((column.count / maxColumnCount) * 46)

      if (previous) {
        const gradient = ctx.createLinearGradient(previous.x, previous.y, column.x, y)
        gradient.addColorStop(0, previous.color)
        gradient.addColorStop(1, color)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(previous.x, previous.y)
        ctx.lineTo(column.x, y)
        ctx.stroke()
      }

      ctx.fillStyle = color
      ctx.fillRect(column.x - 1, y - 1, 3, 3)
      previous = { x: column.x, y, color }
    }
  }

  private drawSourceBounds(ctx: CanvasRenderingContext2D, state: TimelineRenderState, projector: TimelineProjector, source: Source.Type, rowY: number) {
    const minX = projector.xForTimestamp(source.timestamp.min + source.settings.offset)
    const maxX = projector.xForTimestamp(source.timestamp.max + source.settings.offset)
    ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
    ctx.fillRect(minX - 1, rowY - 24, 1, ROW_HEIGHT - 1)
    ctx.fillRect(maxX + 1, rowY - 24, 1, ROW_HEIGHT - 1)
  }

  private drawSourceInfo(ctx: CanvasRenderingContext2D, state: TimelineRenderState, projector: TimelineProjector, source: Source.Type, rowY: number) {
    const minX = projector.xForTimestamp(source.timestamp.min + source.settings.offset)
    const maxX = projector.xForTimestamp(source.timestamp.max + source.settings.offset)
    const context = Source.Entity.context(state.app, source)
    const requestType = Source.Entity.getRequestType(state.app, source)
    const suffix = !requestType ? '' : requestType === 'ingestion' ? ' | Ingesting...' : ' | Loading...'
    const eventCount = Source.Entity.events(state.app, source).length

    ctx.font = '12px Geist, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
    ctx.fillText(source.name + suffix, 10, rowY + 4)
    ctx.fillStyle = Color.Themer.theme.FONT_SECOND
    ctx.fillText(`${source.total.toString()} | ${context?.name || 'Unknown'}`, 10, rowY - 10)
    ctx.fillStyle = '#0372ef'
    ctx.fillText(eventCount.toString(), 10, rowY + 18)

    ctx.textAlign = 'right'
    ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
    ctx.fillText(source.total.toString(), maxX + 54, rowY - 4)
    ctx.fillText(source.total.toString(), minX - 54, rowY - 4)
  }

  private drawSelectionFrame(ctx: CanvasRenderingContext2D, state: TimelineRenderState, projector: TimelineProjector) {
    const left = projector.xForTimestamp(state.frame.min)
    const right = projector.xForTimestamp(state.frame.max)
    ctx.fillStyle = '#ff000080'
    ctx.fillRect(left - 2, 0, 3, state.height)
    ctx.fillRect(right + 2, 0, 3, state.height)
  }

  private drawTargetCrosshair(ctx: CanvasRenderingContext2D, state: TimelineRenderState, projector: TimelineProjector, sources: Source.Type[]) {
    if (!state.app.timeline.target) {
      return
    }

    const source = Source.Entity.id(state.app, state.app.timeline.target['gulp.source_id'])
    if (!source) {
      return
    }

    const index = sources.findIndex(item => item.id === source.id)
    if (index === -1) {
      return
    }

    const y = index * ROW_HEIGHT - state.scrollY
    const x = projector.xForTimestamp(state.app.timeline.target.timestamp + source.settings.offset)
    ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
    ctx.fillRect(0, y, state.width, 1)
    ctx.fillRect(x, 0, 1, state.height)
  }

  private drawFlaggedDocuments(ctx: CanvasRenderingContext2D, state: TimelineRenderState, projector: TimelineProjector, sources: Source.Type[]) {
    const operation = Operation.Entity.selected(state.app)
    const flagged = Doc.Entity.flag.getList(operation?.id)
    if (!flagged.size) {
      return
    }

    for (const id of flagged) {
      const doc = Doc.Entity.id(state.app, id)
      if (!doc) {
        continue
      }
      const sourceIndex = sources.findIndex(source => source.id === doc['gulp.source_id'])
      if (sourceIndex === -1) {
        continue
      }
      const source = sources[sourceIndex]
      const x = projector.xForTimestamp(doc.timestamp + source.settings.offset)
      if (x < -8 || x > state.width + 8) {
        continue
      }
      const y = sourceIndex * ROW_HEIGHT - state.scrollY
      ctx.fillStyle = '#00FF00'
      ctx.fillRect(x - 1, y - 25, 1, 51)
      ctx.fillRect(x, y - 27, 1, 55)
      ctx.fillRect(x + 1, y - 25, 1, 51)
    }
  }

  private renderNotesLayer(state: TimelineRenderState, projector: TimelineProjector, sources: Source.Type[], allowShift: boolean) {
    if (!this.layers) {
      return
    }

    const ctx = this.layers.notes.getContext('2d')
    if (!ctx) {
      return
    }

    this.noteHits = []
    this.noteHitBuckets.clear()
    if (allowShift && this.lastState && this.lastState.scrollX !== state.scrollX) {
      this.shiftLayer('notes', this.lastState.scrollX - state.scrollX)
      const strip = exposedStrip(state.width, this.lastState.scrollX - state.scrollX)
      ctx.clearRect(strip.startX, 0, strip.endX - strip.startX, state.height)
    } else {
      ctx.clearRect(0, 0, state.width, state.height)
    }

    if (state.app.hidden.notes) {
      return
    }

    for (let index = 0; index < sources.length; index++) {
      const source = sources[index]
      const rowY = index * ROW_HEIGHT - state.scrollY
      if (rowY < -ROW_HEIGHT || rowY > state.height + ROW_HEIGHT) {
        continue
      }

      const notes = this.getSortedNotes(state.app, source)
      if (!notes.length) {
        continue
      }

      const minTimestamp = projector.timestampForX(-NOTE_SIZE)
      const maxTimestamp = projector.timestampForX(state.width + NOTE_SIZE)
      const visibleRange = findIndexWindowDescending(notes, note => Note.Entity.timestamp(note), minTimestamp, maxTimestamp)
      const visibleNotes = visibleRange ? notes.slice(visibleRange.start, visibleRange.end + 1) : []

      if (!visibleNotes.length) {
        continue
      }

      const groups = this.getNoteGroups(source, visibleNotes, projector, state.scale)
      for (const group of groups) {
        const groupNotes = visibleNotes.slice(group.index, group.index + group.count)
        const seed = groupNotes[0]
        this.drawNote(ctx, projector, rowY, seed, groupNotes)
      }
    }
  }

  private drawNote(ctx: CanvasRenderingContext2D, projector: TimelineProjector, rowY: number, note: Note.Type, groupNotes: Note.Type[]) {
    const x = projector.xForTimestamp(Note.Entity.timestamp(note)) - (NOTE_SIZE / 2)
    const y = rowY - (NOTE_SIZE / 2)
    const noteColor = note.color || Color.Themer.theme.FONT_ACCENT
    const label = groupNotes.length > 1 ? `${groupNotes.length}` : note.name

    ctx.fillStyle = Color.Themer.theme.BACKGROUND_SECOND
    ctx.strokeStyle = noteColor
    ctx.lineWidth = 1
    roundRect(ctx, x, y, NOTE_SIZE, NOTE_SIZE, 5)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = noteColor
    roundRect(ctx, x, y + NOTE_SIZE - 4, NOTE_SIZE, 4, 4)
    ctx.fill()

    const icon = getCanvasIcon({ name: Note.Entity.icon(note), color: noteColor })
    ctx.drawImage(icon, x + 8, y + 7, 16, 16)

    ctx.font = '10px GeistMono, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
    ctx.fillText(label, x + NOTE_SIZE / 2, y + NOTE_SIZE + 10)

    this.noteHits.push({
      rect: { x, y, w: NOTE_SIZE, h: NOTE_SIZE },
      notes: groupNotes,
      sourceId: note.source_id
    })
    this.indexHitRegion(this.noteHitBuckets, this.noteHits[this.noteHits.length - 1])
  }

  private renderLinksLayer(state: TimelineRenderState, projector: TimelineProjector, sources: Source.Type[], allowShift: boolean) {
    if (!this.layers) {
      return
    }

    const ctx = this.layers.links.getContext('2d')
    if (!ctx) {
      return
    }

    this.linkHits = []
    this.linkHitBuckets.clear()
    if (allowShift && this.lastState && this.lastState.scrollX !== state.scrollX) {
      this.shiftLayer('links', this.lastState.scrollX - state.scrollX)
      const strip = exposedStrip(state.width, this.lastState.scrollX - state.scrollX)
      ctx.clearRect(strip.startX, 0, strip.endX - strip.startX, state.height)
    } else {
      ctx.clearRect(0, 0, state.width, state.height)
    }

    if (state.app.hidden.links) {
      return
    }

    const sourceIndex = new Map<Source.Id, number>()
    sources.forEach((source, index) => sourceIndex.set(source.id, index))

    for (const link of state.app.target.links) {
      const dots = link.doc_ids
        .map(id => Doc.Entity.id(state.app, id))
        .filter(Boolean)
        .map(doc => {
          const row = sourceIndex.get(doc['gulp.source_id'])
          if (row === undefined) {
            return null
          }
          const source = sources[row]
          const x = projector.xForTimestamp(doc.timestamp + source.settings.offset)
          const y = row * ROW_HEIGHT - state.scrollY
          return { x, y }
        })
        .filter(Boolean) as Array<{ x: number; y: number }>

      if (dots.length < 2) {
        continue
      }

      if (dots.every(dot => dot.x < -LINK_BADGE_SIZE || dot.x > state.width + LINK_BADGE_SIZE)) {
        continue
      }

      ctx.lineWidth = 2
      ctx.strokeStyle = link.color || Color.Themer.theme.FONT_ACCENT
      ctx.beginPath()
      ctx.moveTo(dots[0].x, dots[0].y)
      for (let index = 1; index < dots.length; index++) {
        ctx.lineTo(dots[index].x, dots[index].y)
      }
      ctx.stroke()

      for (let index = 0; index < dots.length - 1; index++) {
        const start = dots[index]
        const end = dots[index + 1]
        const x = (start.x + end.x) / 2
        const y = (start.y + end.y) / 2
        this.drawLinkBadge(ctx, link, x, y)
      }
    }
  }

  private drawLinkBadge(ctx: CanvasRenderingContext2D, link: Link.Type, x: number, y: number) {
    const left = x - (LINK_BADGE_SIZE / 2)
    const top = y - (LINK_BADGE_SIZE / 2)
    const color = link.color || Color.Themer.theme.FONT_ACCENT

    ctx.fillStyle = Color.Themer.theme.BACKGROUND_SECOND
    ctx.strokeStyle = color
    roundRect(ctx, left, top, LINK_BADGE_SIZE, LINK_BADGE_SIZE, 4)
    ctx.fill()
    ctx.stroke()

    const icon = getCanvasIcon({ name: Link.Entity.icon(link), color })
    ctx.drawImage(icon, left + 4, top + 4, 16, 16)

    this.linkHits.push({
      rect: { x: left, y: top, w: LINK_BADGE_SIZE, h: LINK_BADGE_SIZE },
      link
    })
    this.indexHitRegion(this.linkHitBuckets, this.linkHits[this.linkHits.length - 1])
  }

  private renderPointersLayer(state: TimelineRenderState, projector: TimelineProjector, sources: Source.Type[]) {
    if (!this.layers) {
      return
    }

    const ctx = this.layers.pointers.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, state.width, state.height)

    const points: Pointers.Pointer[] = [
      {
        id: 'You' as never,
        color: 'var(--green-700)',
        timestamp: state.pointer.timestamp,
        x: state.pointer.self.x,
        y: state.pointer.self.y
      },
      ...state.pointer.peers
    ]

    for (const pointer of points) {
      const x = typeof pointer.x === 'number' ? pointer.x : projector.xForTimestamp(pointer.timestamp)
      const y = pointer.id === ('You' as never) ? pointer.y : pointer.y - state.scrollY
      if (x < -64 || x > state.width + 64 || y < -64 || y > state.height + 64) {
        continue
      }
      this.drawPointer(ctx, x, y, pointer, state.width)
    }
  }

  private drawPointer(ctx: CanvasRenderingContext2D, x: number, y: number, pointer: Pointers.Pointer, stateWidth: number) {
    const isYours = pointer.id === ('You' as never)
    const isRightSide = x > stateWidth / 2

    // Resolve CSS variables specifically for Canvas
    let color = pointer.color || Color.Themer.theme.FONT_ACCENT
    if (color === 'var(--green-700)') {
      color = '#46a758' // Resolved from global.css (131, 41%, 46%)
    }

    ctx.save()

    // 1. Position and render the Icon
    // Stabilize the hotspot at exactly (x, y)
    ctx.translate(x, y)

    // 1. Render the Arrow (Path-based for absolute precision)
    ctx.save()
    if (!isRightSide) {
      ctx.scale(-1, 1) // Flip orientation around the hotspot (0, 0)
    }

    ctx.fillStyle = color
    ctx.beginPath()
    // A standard arrow pointing exactly to (0, 0)
    ctx.moveTo(0, 0)
    ctx.lineTo(15, 6)
    ctx.lineTo(6, 15)
    ctx.closePath()
    ctx.fill()

    // Subtle border for visibility
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore() // End of Arrow-only flip

    // 2. Render the Label
    const textContent = `${pointer.id}${isYours ? ` on ${formatTimestampToReadableString(pointer.timestamp)}ms` : ''}`
    ctx.font = '500 11px GeistMono, monospace'
    const metrics = ctx.measureText(textContent)
    const padding = 4
    const labelWidth = metrics.width + padding * 2
    const labelHeight = 20

    const gap = 18
    const labelX = !isRightSide ? (-labelWidth - gap) : gap
    const labelY = 10

    // Label background
    ctx.fillStyle = color
    roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 4)
    ctx.fill()

    // Label border
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Label text
    ctx.fillStyle = 'white'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 1
    ctx.shadowColor = 'black'
    ctx.fillText(textContent, labelX + padding, labelY + labelHeight / 2)
    ctx.shadowBlur = 0

    ctx.restore() // End of coordinate translate(x, y)
  }

  private composeLayers(width: number, height: number) {
    if (!this.layers) {
      return
    }

    const ctx = this.layers.composite.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(this.layers.background, 0, 0)
    ctx.drawImage(this.layers.events, 0, 0)
    ctx.drawImage(this.layers.links, 0, 0)
    ctx.drawImage(this.layers.notes, 0, 0)
    ctx.drawImage(this.layers.pointers, 0, 0)
  }

  private shiftLayer(name: 'events' | 'links' | 'notes', dx: number) {
    if (!this.layers || !dx) {
      return
    }

    const canvas = this.layers[name]
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const scratch = this.getScratchLayer(name, canvas.width, canvas.height)
    const scratchCtx = scratch.getContext('2d')
    if (!scratchCtx) {
      return
    }

    scratchCtx.clearRect(0, 0, scratch.width, scratch.height)
    scratchCtx.drawImage(canvas, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(scratch, dx, 0)
  }

  private getScratchLayer(name: string, width: number, height: number) {
    const existing = this.scratchLayers.get(name)
    if (existing) {
      if (existing.width !== width) {
        existing.width = width
      }
      if (existing.height !== height) {
        existing.height = height
      }
      return existing
    }

    const scratch = document.createElement('canvas')
    scratch.width = width
    scratch.height = height
    this.scratchLayers.set(name, scratch)
    return scratch
  }

  private getSourceRange(source: Source.Type, events: Doc.Type[]): MinMax {
    const signature = `${events.length}:${events[0]?.timestamp || 0}:${events[events.length - 1]?.timestamp || 0}:${source.settings.field}`
    const cached = this.sourceMeta.get(source.id)
    if (cached && cached.signature === signature) {
      return cached.range
    }

    const range = {
      min: Infinity,
      max: -Infinity
    }

    for (const event of events) {
      const value = numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine(source, event)
      const normalized = Number.isFinite(value) ? value : 0
      if (normalized < range.min) {
        range.min = normalized
      }
      if (normalized > range.max) {
        range.max = normalized
      }
    }

    const safeRange = {
      min: range.min === Infinity ? 0 : range.min,
      max: range.max === -Infinity ? 1 : range.max
    }
    this.sourceMeta.set(source.id, { signature, range: safeRange })
    return safeRange
  }

  private getSortedNotes(app: App.Type, source: Source.Type) {
    const notes = Note.Entity.findByFile(app, source)
    const signature = `${notes.length}:${notes[0]?.id || 'none'}:${notes[notes.length - 1]?.id || 'none'}`
    const cached = this.sortedNotes.get(source.id)
    if (cached && cached.signature === signature) {
      return cached.notes
    }

    const sorted = [...notes].sort((a, b) => Note.Entity.timestamp(b) - Note.Entity.timestamp(a))
    this.sortedNotes.set(source.id, {
      signature,
      notes: sorted
    })
    return sorted
  }

  private indexHitRegion<T extends { rect: Rect }>(buckets: Map<string, T[]>, region: T) {
    const startBucketX = Math.floor(region.rect.x / HIT_BUCKET)
    const endBucketX = Math.floor((region.rect.x + region.rect.w) / HIT_BUCKET)
    const startBucketY = Math.floor(region.rect.y / HIT_BUCKET)
    const endBucketY = Math.floor((region.rect.y + region.rect.h) / HIT_BUCKET)

    for (let bucketY = startBucketY; bucketY <= endBucketY; bucketY++) {
      for (let bucketX = startBucketX; bucketX <= endBucketX; bucketX++) {
        const key = `${bucketX}:${bucketY}`
        const items = buckets.get(key)
        if (items) {
          items.push(region)
        } else {
          buckets.set(key, [region])
        }
      }
    }
  }

  private getNoteGroups(source: Source.Type, notes: Note.Type[], projector: TimelineProjector, scale: number) {
    const signature = `${notes.length}:${notes[0]?.id || 'none'}:${notes[notes.length - 1]?.id || 'none'}`
    const cached = this.noteGroups.get(source.id)
    if (cached && cached.signature === signature && cached.scale === scale) {
      return cached.groups
    }

    const groups: Array<{ index: number; count: number }> = []
    let index = 0
    while (index < notes.length) {
      const startX = projector.xForTimestamp(Note.Entity.timestamp(notes[index]))
      let end = index
      while (end + 1 < notes.length) {
        const nextX = projector.xForTimestamp(Note.Entity.timestamp(notes[end + 1]))
        if (Math.abs(nextX - startX) > 32) {
          break
        }
        end += 1
      }
      groups.push({ index, count: end - index + 1 })
      index = end + 1
    }

    this.noteGroups.set(source.id, { signature, scale, groups, notes })
    return groups
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius)
    return
  }
  ctx.rect(x, y, width, height)
}

function isInside(rect: Rect, point: ViewportPoint) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h
}

function bucketKey(x: number, y: number) {
  return `${Math.floor(x / HIT_BUCKET)}:${Math.floor(y / HIT_BUCKET)}`
}

function withAlpha(color: string, alpha: number) {
  const safe = Math.max(0, Math.min(1, alpha))
  const suffix = Math.round(safe * 255).toString(16).padStart(2, '0')
  return `${color}${suffix}`
}

function getEventColor(source: Source.Type, value: number, range: MinMax) {
  const key = `${source.settings.render_color_palette}:${range.min}:${range.max}:${value}`
  const cache = getEventColor.cache
  const existing = cache.get(key)
  if (existing) {
    return existing
  }
  const color = Color.Entity.gradient(source.settings.render_color_palette, value, range)
  cache.set(key, color)
  return color
}

getEventColor.cache = new Map<string, string>()

function exposedStrip(width: number, dx: number) {
  if (!dx) {
    return { startX: 0, endX: width }
  }
  if (dx > 0) {
    return { startX: 0, endX: Math.min(width, dx + 2) }
  }
  return { startX: Math.max(0, width + dx - 2), endX: width }
}
