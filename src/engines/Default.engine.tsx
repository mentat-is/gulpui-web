import { λFile } from '@/dto/Dataset'
import {
  Engine,
  Hardcode
} from '../class/Engine.dto'
import { RenderEngine } from '../class/RenderEngine'
import { λColor } from '@/ui/utils'
import { Event, File, MinMax } from '@/class/Info'

export class DefaultEngine implements Engine.Interface<typeof DefaultEngine.target> {
  private static instance: DefaultEngine | null = null
  static target: Map<number, [number, number]> & {
    [Hardcode.MinHeight]: number,
    [Hardcode.MaxHeight]: number,
    [Hardcode.Scale]: number,
  }
  private renderer!: RenderEngine
  map = new Map<λFile['id'], typeof DefaultEngine.target>()

  constructor(renderer: Engine.Constructor) {
    if (DefaultEngine.instance) {
      DefaultEngine.instance.renderer = renderer
      return DefaultEngine.instance
    }

    this.renderer = renderer
    DefaultEngine.instance = this
  }

  render(file: λFile, y: number, force?: boolean) {
    const map = this.get(file, force)

    const events = Array.from(map.entries())

    events.forEach(([_, [code, timestamp]]) => {
      if (timestamp > this.renderer.info.app.timeline.frame.max || timestamp < this.renderer.info.app.timeline.frame.min) {
        return;
      }

      this.renderer.ctx.fillStyle = λColor.gradient(file.settings.color, code, {
        min: map[Hardcode.MinHeight],
        max: map[Hardcode.MaxHeight],
      })

      this.renderer.ctx.fillRect(
        this.renderer.getPixelPosition(timestamp),
        y,
        1,
        47,
      )
    })
  }

  get(file: λFile, force?: boolean): typeof DefaultEngine.target {
    if (this.is(file) && !force)
      return this.map.get(file.id) as typeof DefaultEngine.target

    const map = new Map() as typeof DefaultEngine.target
    const events = File.events(this.renderer.info.app, file)

    if (events.length === 0) {
      return map
    }

    const firstEvent = events[0]
    const lastEvent = events[events.length - 1]

    const visiblePixelRange: MinMax = {
      min: Math.max(
        this.renderer.getPixelPosition(file.timestamp.min),
        this.renderer.getPixelPosition(lastEvent.timestamp),
        -128,
      ),
      max: Math.min(
        this.renderer.getPixelPosition(file.timestamp.max),
        this.renderer.getPixelPosition(firstEvent.timestamp),
        this.renderer.ctx.canvas.width + 128,
      ),
    }

    const getTimestampForPixel = (x: number): number => {
      const visibleWidth =
        this.renderer.ctx.canvas.width * this.renderer.info.app.timeline.scale
      const pixelOffset = x + this.renderer.scrollX

      return (
        this.renderer.info.app.timeline.frame.min +
        (pixelOffset / visibleWidth) *
        (this.renderer.info.app.timeline.frame.max -
          this.renderer.info.app.timeline.frame.min)
      )
    }

    const findClosestEventIndex = (targetTimestamp: number): number => {
      let low = 0
      let high = events.length - 1
      let closestIndex = 0
      let closestDiff = Infinity

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const currentTimestamp = events[mid].timestamp
        const diff = Math.abs(currentTimestamp - targetTimestamp)

        if (
          diff < closestDiff ||
          (diff === closestDiff && mid < closestIndex)
        ) {
          closestDiff = diff
          closestIndex = mid
        }

        if (currentTimestamp > targetTimestamp) {
          low = mid + 1
        } else if (currentTimestamp < targetTimestamp) {
          high = mid - 1
        } else {
          return mid
        }
      }

      for (let offset = -1; offset <= 1; offset++) {
        const idx = closestIndex + offset
        if (idx >= 0 && idx < events.length) {
          const diff = Math.abs(events[idx].timestamp - targetTimestamp)
          if (
            diff < closestDiff ||
            (diff === closestDiff && idx < closestIndex)
          ) {
            closestDiff = diff
            closestIndex = idx
          }
        }
      }

      return closestIndex
    }

    for (let x = visiblePixelRange.min; x < visiblePixelRange.max; x++) {
      const targetTimestamp = getTimestampForPixel(x)
      const closestIndex = findClosestEventIndex(targetTimestamp)

      const event = events[closestIndex]
      map.set(x, [
        Number(event[file.settings.field]),
        Event.timestamp(event),
      ])
    }

    map[Hardcode.Scale] = this.renderer.info.app.timeline.scale
    map[Hardcode.MinHeight] = file.code.min
    map[Hardcode.MaxHeight] = file.code.max
    this.map.set(file.id, map)

    return map as typeof DefaultEngine.target
  }

  is = (file: λFile) => Boolean(this.map.get(file.id)?.[Hardcode.Scale] === this.renderer.info.app.timeline.scale);
}
