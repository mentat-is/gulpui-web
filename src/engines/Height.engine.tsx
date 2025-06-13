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
    const isPending = this.renderer.info.app.general.requests.filter(r => r.for === file.id && r.status === 'pending').length > 0

    if (!isPending && !this.samples.has(file.id)) {
      this.getSamples(file)
    }

    const sampledFile = this.samples.get(file.id)
    if (!sampledFile) {
      return
    }

    const { data: sampledData, maxHeight } = sampledFile

    const visibleStartTime = this.renderer.limits.min
    const visibleEndTime = this.renderer.limits.max

    let renderedBars = 0
    let skippedNotVisible = 0
    let skippedThrowable = 0

    for (const [timestamp, amount] of sampledData.entries()) {
      const adjustedTimestamp = timestamp + file.settings.offset

      if (adjustedTimestamp < visibleStartTime || adjustedTimestamp > visibleEndTime) {
        skippedNotVisible++
        continue
      }

      if (throwableByTimestamp(adjustedTimestamp, this.renderer.limits, this.renderer.info.app)) {
        skippedThrowable++
        continue
      }

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
  }

  getSamples(file: λFile) {
    const startTime = performance.now()
    const events = File.events(this.renderer.info.app, file)

    const actualMinTime = Math.min(file.timestamp.min, file.timestamp.max)
    const actualMaxTime = Math.max(file.timestamp.min, file.timestamp.max)

    const sampledData = new Map<number, number>()

    const totalDuration = actualMaxTime - actualMinTime
    const bucketCount = Math.ceil(totalDuration / SAMPLE_SIZE)

    for (let i = 0; i <= bucketCount; i++) {
      const timestamp = actualMinTime + (i * SAMPLE_SIZE)
      if (timestamp <= actualMaxTime) {
        sampledData.set(timestamp, 0)
      }
    }

    let processedEvents = 0
    let outOfBoundsEvents = 0

    events.forEach(event => {
      if (event.timestamp < actualMinTime || event.timestamp > actualMaxTime) {
        outOfBoundsEvents++
        return
      }

      const bucketIndex = Math.floor((event.timestamp - actualMinTime) / SAMPLE_SIZE)
      const bucketStart = actualMinTime + (bucketIndex * SAMPLE_SIZE)

      const currentCount = sampledData.get(bucketStart) || 0
      sampledData.set(bucketStart, currentCount + 1)
      processedEvents++
    })

    let maxHeight = 0
    for (const value of sampledData.values()) {
      if (value > maxHeight) {
        maxHeight = value
      }
    }

    this.samples.set(file.id, {
      data: sampledData,
      maxHeight,
      actualMinTime,
      actualMaxTime
    })
  }

  get(file: λFile): typeof HeightEngine.target {
    if (this.is(file))
      return this.map.get(file.id) as typeof HeightEngine.target

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

  updateSamplesIncremental(file: λFile, newEvents: λEvent[]) {
    let sampledFile = this.samples.get(file.id)
    if (!sampledFile) {
      this.getSamples(file)
      return
    }

    const { data: sampledData, actualMinTime } = sampledFile
    let maxHeight = sampledFile.maxHeight
    let updated = false

    newEvents.forEach(event => {
      if (event.timestamp < actualMinTime || event.timestamp > sampledFile.actualMaxTime) {
        return
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
    }
  }
}
