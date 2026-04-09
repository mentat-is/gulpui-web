import { MinMax } from '@/class/Info'
import { Doc } from '@/entities/Doc'
import { Source } from '@/entities/Source'
import { numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine } from '@/ui/utils'

export interface TimelineProjector {
  frame: MinMax
  canvasWidth: number
  worldWidth: number
  scrollX: number
  range: number
  xForTimestamp: (timestamp: number) => number
  timestampForX: (x: number) => number
}

export interface VisibleWindow {
  start: number
  end: number
  count: number
}

export interface EventColumn {
  x: number
  count: number
  sampleValue: number
  maxValue: number
  start: number
  end: number
}

export interface IndexWindow {
  start: number
  end: number
  count: number
}

export function createTimelineProjector(frame: MinMax, canvasWidth: number, scale: number, scrollX: number): TimelineProjector {
  const safeCanvasWidth = Math.max(1, canvasWidth)
  const worldWidth = Math.max(1, Math.round(safeCanvasWidth * Math.max(scale, 0.0001)))
  const range = Math.max(1, frame.max - frame.min)

  return {
    frame,
    canvasWidth: safeCanvasWidth,
    worldWidth,
    scrollX,
    range,
    xForTimestamp(timestamp: number) {
      return Math.round(((timestamp - frame.min) / range) * worldWidth) - scrollX
    },
    timestampForX(x: number) {
      return frame.min + ((x + scrollX) / worldWidth) * range
    }
  }
}

export function findVisibleWindowDescending(events: Doc.Type[], minTimestamp: number, maxTimestamp: number): VisibleWindow | null {
  return findIndexWindowDescending(events, event => event.timestamp, minTimestamp, maxTimestamp)
}

export function findIndexWindowDescending<T>(items: T[], getTimestamp: (item: T) => number, minTimestamp: number, maxTimestamp: number): IndexWindow | null {
  if (items.length === 0) {
    return null
  }

  let start = items.length
  let left = 0
  let right = items.length - 1

  while (left <= right) {
    const mid = (left + right) >>> 1
    if (getTimestamp(items[mid]) <= maxTimestamp) {
      start = mid
      right = mid - 1
    } else {
      left = mid + 1
    }
  }

  if (start === items.length) {
    return null
  }

  let end = -1
  left = start
  right = items.length - 1

  while (left <= right) {
    const mid = (left + right) >>> 1
    if (getTimestamp(items[mid]) >= minTimestamp) {
      end = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  if (end < start) {
    return null
  }

  return {
    start,
    end,
    count: end - start + 1
  }
}

function collectColumnFromRange(events: Doc.Type[], source: Source.Type, start: number, end: number, x: number): EventColumn {
  let maxValue = -Infinity
  let sampleValue = 0

  for (let index = start; index <= end; index++) {
    const value = numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine(source, events[index])
    if (index === start) {
      sampleValue = value
    }
    if (value > maxValue) {
      maxValue = value
    }
  }

  return {
    x,
    count: end - start + 1,
    sampleValue,
    maxValue: maxValue === -Infinity ? sampleValue : maxValue,
    start,
    end
  }
}

export function clusterEventsToColumns(
  events: Doc.Type[],
  source: Source.Type,
  projector: TimelineProjector,
  visible: VisibleWindow,
  overscan = 32
): EventColumn[] {
  if (visible.count <= 0) {
    return []
  }

  const offset = source.settings.offset || 0
  const leftBound = -overscan
  const rightBound = projector.canvasWidth + overscan
  const denseThreshold = projector.canvasWidth * 8

  if (visible.count > denseThreshold) {
    const columns: EventColumn[] = []
    let searchStart = visible.start

    for (let x = rightBound; x >= leftBound; x--) {
      const bucketMax = projector.timestampForX(x + 0.5) - offset
      const bucketMin = projector.timestampForX(x - 0.5) - offset

      let columnStart = -1
      let columnEnd = -1

      let left = searchStart
      let right = visible.end
      while (left <= right) {
        const mid = (left + right) >>> 1
        if (events[mid].timestamp <= bucketMax) {
          columnStart = mid
          right = mid - 1
        } else {
          left = mid + 1
        }
      }

      if (columnStart === -1) {
        continue
      }

      left = columnStart
      right = visible.end
      while (left <= right) {
        const mid = (left + right) >>> 1
        if (events[mid].timestamp >= bucketMin) {
          columnEnd = mid
          left = mid + 1
        } else {
          right = mid - 1
        }
      }

      if (columnEnd === -1 || columnEnd < columnStart) {
        continue
      }

      columns.push(collectColumnFromRange(events, source, columnStart, columnEnd, x))
      searchStart = columnEnd + 1
      if (searchStart > visible.end) {
        break
      }
    }

    return columns.reverse()
  }

  const columns: EventColumn[] = []
  let index = visible.start

  while (index <= visible.end) {
    const x = projector.xForTimestamp(events[index].timestamp + offset)
    let end = index

    while (end + 1 <= visible.end) {
      const nextX = projector.xForTimestamp(events[end + 1].timestamp + offset)
      if (nextX !== x) {
        break
      }
      end += 1
    }

    if (x >= leftBound && x <= rightBound) {
      columns.push(collectColumnFromRange(events, source, index, end, x))
    }

    index = end + 1
  }

  return columns
}
