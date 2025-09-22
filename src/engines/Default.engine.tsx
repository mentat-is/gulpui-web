import {
  Engine,
  Hardcode,
  CacheKey
} from '../class/Engine.dto'
import { RenderEngine } from '../class/RenderEngine'
import { Refractor } from '@/ui/utils'
import { MinMax } from '@/class/Info'
import { Logger } from '@/dto/Logger.class'
import { Source } from '@/entities/Source'
import { Color } from '@/entities/Color'
import { Doc } from '@/entities/Doc'

export class DefaultEngine implements Engine.Interface<typeof DefaultEngine.target> {
  static instance: DefaultEngine | null = null
  static target: Map<number, [number, number]> & {
    [Hardcode.MinHeight]: number,
    [Hardcode.MaxHeight]: number,
    [Hardcode.Scale]: number,
  }
  private renderer!: RenderEngine
  map = new Map<Source.Id, typeof DefaultEngine.target>()

  constructor(renderer: Engine.Constructor) {
    if (DefaultEngine.instance) {
      DefaultEngine.instance.renderer = renderer
      return DefaultEngine.instance
    }

    this.renderer = renderer
    DefaultEngine.instance = this
  }

  render(file: Source.Type, y: number, force?: boolean) {
    const map = this.get(file, force);

    const range = this.getRanges(file);

    const events = Array.from(map.entries())

    events.forEach(([_, [code, timestamp]]) => {
      timestamp += file.settings.offset;
      if (timestamp > this.renderer.info.app.timeline.frame.max || timestamp < this.renderer.info.app.timeline.frame.min) {
        return;
      }

      this.renderer.ctx.fillStyle = Color.Entity.gradient(file.settings.render_color_palette, code, range);

      this.renderer.ctx.fillRect(
        this.renderer.getPixelPosition(timestamp),
        y,
        1,
        47,
      );
    })
  }

  get(file: Source.Type, force?: boolean): typeof DefaultEngine.target {
    if (this.is(file) && !force)
      return this.map.get(file.id) as typeof DefaultEngine.target

    const map = new Map() as typeof DefaultEngine.target
    const events = Source.Entity.events(this.renderer.info.app, file)

    if (events.length === 0) {
      return map
    }

    const firstEvent = events[0]
    const lastEvent = events[events.length - 1]

    const canvas: MinMax = {
      min: -128,
      max: this.renderer.ctx.canvas.width + 128
    }

    // нормализованный диапазон пикселей
    const calcMin = Math.max(
      this.renderer.getPixelPosition(file.timestamp.min + file.settings.offset),
      this.renderer.getPixelPosition(lastEvent.timestamp + file.settings.offset),
      canvas.min,
    )
    const calcMax = Math.min(
      this.renderer.getPixelPosition(file.timestamp.max + file.settings.offset),
      this.renderer.getPixelPosition(firstEvent.timestamp + file.settings.offset),
      canvas.max,
    )

    let start = file.settings.offset > 0 ? canvas.min : Math.min(calcMin, calcMax)
    let end = file.settings.offset > 0 ? canvas.max : Math.max(calcMin, calcMax)

    // гарантировать хотя бы 1 пиксель для одиночного события
    if (end - start < 1) end = start + 1

    const visiblePixelRange: MinMax = { min: Math.floor(start), max: Math.ceil(end) }

    const getTimestampForPixel = (x: number): number => {
      const visibleWidth = this.renderer.ctx.canvas.width * this.renderer.info.app.timeline.scale
      const pixelOffset = x + this.renderer.scrollX
      return (
        this.renderer.info.app.timeline.frame.min +
        (pixelOffset / visibleWidth) *
        (this.renderer.info.app.timeline.frame.max - this.renderer.info.app.timeline.frame.min)
      )
    }

    const findClosestEventIndex = (targetTimestamp: number): number => {
      let low = 0
      let high = events.length - 1
      let closestIndex = 0
      let closestDiff = Infinity

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const currentTimestamp = events[mid].timestamp + file.settings.offset
        const diff = Math.abs(currentTimestamp - targetTimestamp)

        if (diff < closestDiff || (diff === closestDiff && mid < closestIndex)) {
          closestDiff = diff
          closestIndex = mid
        }

        // если события отсортированы по возрастанию времени
        if (currentTimestamp < targetTimestamp) {
          low = mid + 1
        } else if (currentTimestamp > targetTimestamp) {
          high = mid - 1
        } else {
          return mid
        }
      }

      // локальная проверка соседей с учётом offset
      for (let offset = -1; offset <= 1; offset++) {
        const idx = closestIndex + offset
        if (idx >= 0 && idx < events.length) {
          const diff = Math.abs((events[idx].timestamp + file.settings.offset) - targetTimestamp)
          if (diff < closestDiff || (diff === closestDiff && idx < closestIndex)) {
            closestDiff = diff
            closestIndex = idx
          }
        }
      }

      return closestIndex
    }

    for (let x = visiblePixelRange.min; x <= visiblePixelRange.max; x++) {
      const targetTimestamp = getTimestampForPixel(x)
      const closestIndex = findClosestEventIndex(targetTimestamp)
      const event = events[closestIndex]
      map.set(x, [
        Refractor.any.toNumber(event[file.settings.field]),
        Doc.Entity.timestamp(event),
      ])
    }

    map[Hardcode.Scale] = this.renderer.info.app.timeline.scale
    this.map.set(file.id, map)

    return map as typeof DefaultEngine.target
  }

  getRanges(file: Source.Type): MinMax {
    const events = Source.Entity.events(this.renderer.info.app, file);
    const cache = RenderEngine[CacheKey].range.get(file.id);
    if (cache && cache.field === file.settings.field) {
      const isSyncedByLength = cache[Hardcode.Length] === events.length;
      if (isSyncedByLength) {
        return cache;
      } else {
        this.computeRanges(file, cache[Hardcode.Length]);
      }
    }

    this.computeRanges(file);
    return this.getRanges(file);
  }

  computeRanges(file: Source.Type, skip: number = 0) {
    const events = Source.Entity.events(this.renderer.info.app, file).slice(skip);

    const cache = RenderEngine[CacheKey].range.get(file.id)!;

    const range = skip > 0 ? cache : {
      min: Infinity,
      max: -Infinity,
      field: file.settings.field
    };

    events.forEach(event => {
      const value = Refractor.any.toNumber(event[file.settings.field]);
      if (value > range.max) {
        range.max = value
      }
      if (value < range.min) {
        range.min = value
      }
    })

    RenderEngine[CacheKey].range.set(file.id, {
      ...range,
      [Hardcode.Length]: events.length
    });

    Logger.log(`RenderEngine cache ranges for file ${file.id} has been recalculated`, DefaultEngine.name);
  }

  is = (file: Source.Type) => Boolean(this.map.get(file.id)?.[Hardcode.Scale] === this.renderer.info.app.timeline.scale);
}
