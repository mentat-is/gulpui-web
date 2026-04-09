import { createTimelineProjector, clusterEventsToColumns, findVisibleWindowDescending } from './geometry'
import { runTimelineStressBenchmark } from './benchmark'

function buildEvents(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const timestamp = 1_000_000 - index
    return {
      _id: `doc-${index}`,
      '@timestamp': new Date(timestamp).toISOString(),
      timestamp,
      'gulp.source_id': 'source-1',
      'gulp.context_id': 'context-1',
      'gulp.operation_id': 'op-1',
      'gulp.timestamp': BigInt(timestamp),
      'gulp.event_code': index,
      value: index % 10
    }
  }) as any[]
}

const source = {
  id: 'source-1',
  context_id: 'context-1',
  settings: {
    offset: 0,
    field: 'value',
    render_color_palette: 'thermal',
    render_engine: 'default'
  }
} as any

test('findVisibleWindowDescending returns visible range for descending timestamps', () => {
  const events = buildEvents(100)
  const visible = findVisibleWindowDescending(events as any, 999_930, 999_960)
  expect(visible).not.toBeNull()
  expect(visible?.count).toBeGreaterThan(0)
  expect(events[visible!.start].timestamp).toBeLessThanOrEqual(999_960)
  expect(events[visible!.end].timestamp).toBeGreaterThanOrEqual(999_930)
})

test('clusterEventsToColumns batches dense windows into canvas columns', () => {
  const events = buildEvents(20_000)
  const projector = createTimelineProjector({ min: 980_000, max: 1_000_000 }, 1000, 1, 0)
  const visible = findVisibleWindowDescending(events as any, 980_000, 1_000_000)
  expect(visible).not.toBeNull()
  const columns = clusterEventsToColumns(events as any, source, projector, visible!)
  expect(columns.length).toBeLessThanOrEqual(1100)
  expect(columns.every(column => column.count >= 1)).toBe(true)
})

test('million event clustering completes within a practical bound', () => {
  const events = buildEvents(1_000_000)
  const projector = createTimelineProjector({ min: 0, max: 1_000_000 }, 1200, 1, 0)
  const start = Date.now()
  const visible = findVisibleWindowDescending(events as any, 0, 1_000_000)
  const columns = clusterEventsToColumns(events as any, source, projector, visible!)
  const elapsed = Date.now() - start
  expect(columns.length).toBeLessThanOrEqual(1300)
  expect(elapsed).toBeLessThan(1500)
})

test('renderer stress benchmark handles 100 sources and 1M events total', () => {
  const result = runTimelineStressBenchmark({
    sourceCount: 100,
    eventsPerSource: 10_000,
    frameWidth: 1440,
    panFrames: 60,
    scale: 1
  })

  expect(result.totalEvents).toBe(1_000_000)
  expect(result.totalColumns).toBeGreaterThan(0)
  expect(result.elapsedMs).toBeLessThan(4000)
  expect(result.estimatedFps).toBeGreaterThanOrEqual(15)
})
