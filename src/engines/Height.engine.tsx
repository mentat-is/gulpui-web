import { Engine, Hardcode, Length, MaxHeight } from '../class/Engine.dto'
import { RenderEngine } from '../class/RenderEngine'
import { Gradients, throwableByTimestamp, λColor } from '@/ui/utils'
import { Event, File } from '../class/Info'
import { λFile } from '@/dto/Dataset'
import { Logger } from '@/dto/Logger.class'
import { λEvent } from '@/dto/ChunkEvent.dto'

const SAMPLE_SIZE = 60000;

export class HeightEngine
  implements Engine.Interface<typeof HeightEngine.target> {
  private static instance: HeightEngine | null = null
  static target: Map<number, number> & MaxHeight & Length
  private renderer!: RenderEngine
  map = new Map<λFile['id'], typeof HeightEngine.target>()
  samples = new Map<λFile['id'], {
    data: Map<number, number>,
    maxHeight: number,
    actualMinTime: number,
    actualMaxTime: number
  }>()

  constructor(renderer: Engine.Constructor) {
    if (HeightEngine.instance) {
      HeightEngine.instance.renderer = renderer
      return HeightEngine.instance
    }

    this.renderer = renderer
    HeightEngine.instance = this
  }

  render(file: λFile, y: number) {
    Logger.log(`Starting render for file ${file.id}`, 'HeightEngine')

    // Check if file is done loading (no pending requests)
    const isPending = this.renderer.info.app.general.requests.filter(r => r.for === file.id && r.status === 'pending').length > 0

    Logger.log(`File ${file.id} pending: ${isPending}`, 'HeightEngine')

    if (!isPending && !this.samples.has(file.id)) {
      Logger.log(`File ${file.id} finished loading, generating samples`, 'HeightEngine')
      this.getSamples(file)
    }

    const sampledFile = this.samples.get(file.id)
    if (!sampledFile) {
      Logger.log(`No samples available for file ${file.id}, skipping render`, 'HeightEngine')
      return
    }

    const { data: sampledData, maxHeight } = sampledFile
    Logger.log(`Using cached samples for file ${file.id}, max height: ${maxHeight}`, 'HeightEngine')

    const visibleStartTime = this.renderer.limits.min
    const visibleEndTime = this.renderer.limits.max

    Logger.log(`Visible range: ${visibleStartTime} to ${visibleEndTime}`, 'HeightEngine')

    let renderedBars = 0
    let skippedNotVisible = 0
    let skippedThrowable = 0

    // Only iterate through visible data
    for (const [timestamp, amount] of sampledData.entries()) {
      const adjustedTimestamp = timestamp + file.settings.offset

      // Skip if not in visible range (performance optimization)
      if (adjustedTimestamp < visibleStartTime || adjustedTimestamp > visibleEndTime) {
        skippedNotVisible++
        continue
      }

      // Apply throwable filter
      if (throwableByTimestamp(adjustedTimestamp, this.renderer.limits, this.renderer.info.app)) {
        skippedThrowable++
        continue
      }

      // Only render bars with data
      if (amount > 0) {
        this.renderer.ctx.fillStyle = λColor.gradient(
          file.settings.color as Gradients,
          amount,
          {
            min: 0,
            max: maxHeight,
          },
        )

        this.renderer.ctx.fillRect(
          this.renderer.getPixelPosition(adjustedTimestamp),
          y + 47,
          1,
          -(1 + (47 - 1) * (amount / maxHeight)),
        )
        renderedBars++
      }
    }

    Logger.log(`Render stats for file ${file.id} - rendered: ${renderedBars}, skipped (not visible): ${skippedNotVisible}, skipped (throwable): ${skippedThrowable}`, 'HeightEngine')
  }

  getSamples(file: λFile) {
    const startTime = performance.now()
    const events = File.events(this.renderer.info.app, file)

    Logger.log(`Starting sampling for file ${file.id}`, 'HeightEngine')
    Logger.log(`Processing ${events.length} events`, 'HeightEngine')
    Logger.log(`File timestamp range - min: ${file.timestamp.min}, max: ${file.timestamp.max}`, 'HeightEngine')

    // Handle descending data by finding actual min/max
    const actualMinTime = Math.min(file.timestamp.min, file.timestamp.max)
    const actualMaxTime = Math.max(file.timestamp.min, file.timestamp.max)

    Logger.log(`Actual time range - min: ${actualMinTime}, max: ${actualMaxTime}`, 'HeightEngine')
    Logger.log(`Sample size: ${SAMPLE_SIZE}ms`, 'HeightEngine')

    const sampledData = new Map<number, number>()

    // Create time buckets at SAMPLE_SIZE intervals
    const totalDuration = actualMaxTime - actualMinTime
    const bucketCount = Math.ceil(totalDuration / SAMPLE_SIZE)

    Logger.log(`Creating ${bucketCount} buckets for ${totalDuration}ms duration`, 'HeightEngine')

    // Initialize all buckets to 0
    for (let i = 0; i <= bucketCount; i++) {
      const timestamp = actualMinTime + (i * SAMPLE_SIZE)
      if (timestamp <= actualMaxTime) {
        sampledData.set(timestamp, 0)
      }
    }

    Logger.log(`Initialized ${sampledData.size} time buckets`, 'HeightEngine')

    // Count events in each bucket
    let processedEvents = 0
    let outOfBoundsEvents = 0

    events.forEach(event => {
      if (event.timestamp < actualMinTime || event.timestamp > actualMaxTime) {
        outOfBoundsEvents++
        return
      }

      // Find which bucket this event belongs to
      const bucketIndex = Math.floor((event.timestamp - actualMinTime) / SAMPLE_SIZE)
      const bucketStart = actualMinTime + (bucketIndex * SAMPLE_SIZE)

      const currentCount = sampledData.get(bucketStart) || 0
      sampledData.set(bucketStart, currentCount + 1)
      processedEvents++
    })

    Logger.log(`Processed ${processedEvents} events, ${outOfBoundsEvents} out of bounds`, 'HeightEngine')

    // Calculate max height
    let maxHeight = 0
    for (const value of sampledData.values()) {
      if (value > maxHeight) {
        maxHeight = value
      }
    }

    // Log distribution stats
    const nonZeroBuckets = Array.from(sampledData.values()).filter(count => count > 0).length
    const totalEvents = Array.from(sampledData.values()).reduce((sum, count) => sum + count, 0)

    Logger.log(`Sampling complete - max height: ${maxHeight}, non-zero buckets: ${nonZeroBuckets}/${sampledData.size}`, 'HeightEngine')
    Logger.log(`Total events in buckets: ${totalEvents}, processing time: ${(performance.now() - startTime).toFixed(2)}ms`, 'HeightEngine')

    // Store the sampled data with metadata
    this.samples.set(file.id, {
      data: sampledData,
      maxHeight,
      actualMinTime,
      actualMaxTime
    })

    Logger.log(`Cached samples for file ${file.id}`, 'HeightEngine')
  }

  // Keep the legacy get method for backward compatibility
  get(file: λFile): typeof HeightEngine.target {
    if (this.is(file))
      return this.map.get(file.id) as typeof HeightEngine.target

    Logger.log(`Using legacy get method for file ${file.id}`, 'HeightEngine')

    const map = new Map() as typeof HeightEngine.target

    File.events(this.renderer.info.app, file).forEach((event) =>
      map.set(event.timestamp, (map.get(event.timestamp) || 0) + 1),
    )

    map[Length] = Event.get(this.renderer.info.app, file.id)
      .length as Hardcode.Length
    let maxHeight = -Infinity
    for (const value of map.values()) {
      if (value > maxHeight) {
        maxHeight = value
      }
    }
    map[MaxHeight] = maxHeight as Hardcode.Height
    this.map.set(file.id, map)

    return map
  }

  is(file: λFile) {
    const length = this.map.get(file.id)?.[Length]
    return Boolean(
      length && length >= Event.get(this.renderer.info.app, file.id).length,
    )
  }

  // Method to update samples incrementally as new chunks arrive
  updateSamplesIncremental(file: λFile, newEvents: λEvent[]) {
    Logger.log(`Incremental update for file ${file.id} with ${newEvents.length} new events`, 'HeightEngine')

    let sampledFile = this.samples.get(file.id)
    if (!sampledFile) {
      Logger.log(`No existing samples, triggering full sampling`, 'HeightEngine')
      this.getSamples(file)
      return
    }

    const { data: sampledData, actualMinTime } = sampledFile
    let maxHeight = sampledFile.maxHeight
    let updated = false

    newEvents.forEach(event => {
      if (event.timestamp < actualMinTime || event.timestamp > sampledFile.actualMaxTime) {
        return // Skip out of bounds events
      }

      const bucketIndex = Math.floor((event.timestamp - actualMinTime) / SAMPLE_SIZE)
      const bucketStart = actualMinTime + (bucketIndex * SAMPLE_SIZE)

      const currentCount = sampledData.get(bucketStart) || 0
      const newCount = currentCount + 1
      sampledData.set(bucketStart, newCount)

      if (newCount > maxHeight) {
        maxHeight = newCount
        updated = true
      }
    })

    if (updated) {
      sampledFile.maxHeight = maxHeight
      Logger.log(`Updated max height to ${maxHeight} for file ${file.id}`, 'HeightEngine')
    }

    Logger.log(`Incremental update complete for file ${file.id}`, 'HeightEngine')
  }

  // Method to clear cache when needed
  // clearCache(fileId?: λFile['id']) {
  //   if (fileId) {
  //     this.samples.delete(fileId)
  //     this.map.delete(fileId)
  //     Logger.log(`Cleared cache for file ${fileId}`, 'HeightEngine')
  //   } else {
  //     this.samples.clear()
  //     this.map.clear()
  //     Logger.log(`Cleared all cache`, 'HeightEngine')
  //   }
  // }
}