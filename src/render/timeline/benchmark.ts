import { createTimelineProjector, clusterEventsToColumns, findVisibleWindowDescending } from './geometry'

interface SyntheticSource {
  id: string
  context_id: string
  settings: {
    offset: number
    field: string
    render_color_palette: 'thermal'
    render_engine: 'default' | 'height' | 'graph'
  }
}

interface SyntheticDoc {
  _id: string
  '@timestamp': string
  timestamp: number
  'gulp.source_id': string
  'gulp.context_id': string
  'gulp.operation_id': string
  'gulp.timestamp': bigint
  'gulp.event_code': number
  value: number
}

export interface StressBenchmarkOptions {
  sourceCount: number
  eventsPerSource: number
  frameWidth: number
  panFrames: number
  scale: number
}

export interface StressBenchmarkResult {
  sourceCount: number
  eventsPerSource: number
  totalEvents: number
  panFrames: number
  totalColumns: number
  elapsedMs: number
  estimatedFps: number
}

export function createSyntheticTimelineDataset(sourceCount: number, eventsPerSource: number) {
  const frame = { min: 0, max: 1_000_000 }
  const sources: SyntheticSource[] = []
  const eventsBySource = new Map<string, SyntheticDoc[]>()

  for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex++) {
    const sourceId = `source-${sourceIndex}`
    const source: SyntheticSource = {
      id: sourceId,
      context_id: `context-${sourceIndex % 8}`,
      settings: {
        offset: sourceIndex % 7,
        field: 'value',
        render_color_palette: 'thermal',
        render_engine: sourceIndex % 3 === 0 ? 'graph' : sourceIndex % 2 === 0 ? 'height' : 'default'
      }
    }
    sources.push(source)

    const events: SyntheticDoc[] = []
    for (let eventIndex = 0; eventIndex < eventsPerSource; eventIndex++) {
      const timestamp = frame.max - eventIndex
      events.push({
        _id: `${sourceId}-doc-${eventIndex}`,
        '@timestamp': new Date(timestamp).toISOString(),
        timestamp,
        'gulp.source_id': sourceId,
        'gulp.context_id': source.context_id,
        'gulp.operation_id': 'op-1',
        'gulp.timestamp': BigInt(timestamp),
        'gulp.event_code': eventIndex,
        value: (eventIndex + sourceIndex) % 512
      })
    }
    eventsBySource.set(sourceId, events)
  }

  return { frame, sources, eventsBySource }
}

export function runTimelineStressBenchmark(options: StressBenchmarkOptions): StressBenchmarkResult {
  const { sourceCount, eventsPerSource, frameWidth, panFrames, scale } = options
  const { frame, sources, eventsBySource } = createSyntheticTimelineDataset(sourceCount, eventsPerSource)
  const panStep = Math.max(1, Math.round(frameWidth / 6))
  let totalColumns = 0

  const start = Date.now()

  for (let panFrame = 0; panFrame < panFrames; panFrame++) {
    const projector = createTimelineProjector(frame, frameWidth, scale, panFrame * panStep)
    for (const source of sources) {
      const events = eventsBySource.get(source.id) || []
      const visible = findVisibleWindowDescending(
        events as never,
        projector.timestampForX(-32) - source.settings.offset,
        projector.timestampForX(frameWidth + 32) - source.settings.offset
      )
      if (!visible) {
        continue
      }
      const columns = clusterEventsToColumns(events as never, source as never, projector, visible)
      totalColumns += columns.length
    }
  }

  const elapsedMs = Math.max(1, Date.now() - start)
  return {
    sourceCount,
    eventsPerSource,
    totalEvents: sourceCount * eventsPerSource,
    panFrames,
    totalColumns,
    elapsedMs,
    estimatedFps: Math.round((panFrames / elapsedMs) * 1000)
  }
}
