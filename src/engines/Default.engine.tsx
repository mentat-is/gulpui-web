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

/**
 * Default render engine: draws individual event bars on the canvas.
 * Uses a pixel-mapped cache (Map<pixelX, [eventCode, timestamp]>) per source.
 * Singleton pattern — only one instance exists, reused across frames.
 */
export class DefaultEngine implements Engine.Interface<typeof DefaultEngine.target> {
  /** Singleton instance, shared across all RenderEngine frames. */
  static instance: DefaultEngine | null = null
  /** Type definition for the per-source pixel map with metadata symbols. */
  static target: Map<number, [number, number]> & {
    [Hardcode.MinHeight]: number,
    [Hardcode.MaxHeight]: number,
    [Hardcode.Scale]: number,
  }
  /** Reference to the parent RenderEngine — updated each frame via updateRenderer(). */
  private renderer!: RenderEngine
  /** Per-source cache of computed pixel data. Key: source ID, Value: pixel map. */
  map = new Map<Source.Id, typeof DefaultEngine.target>()

  constructor(renderer: Engine.Constructor) {
    if (DefaultEngine.instance) {
      DefaultEngine.instance.renderer = renderer
      return DefaultEngine.instance
    }

    this.renderer = renderer
    DefaultEngine.instance = this
  }

  /** Updates the renderer reference without constructor overhead. Called per frame. */
  updateRenderer(renderer: Engine.Constructor) {
    this.renderer = renderer
  }

  /**
   * Renders event bars for a source at the given Y position.
   * Iterates the cached pixel map directly with forEach() (no Array.from() allocation).
   * Skips events outside the visible time frame for performance.
   */
  render(file: Source.Type, y: number, force?: boolean) {
    const map = this.get(file, force);

    const range = this.getRanges(file);

    map.forEach(([code, timestamp], _x) => {
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

    const visiblePixelRange: MinMax = file.settings.offset > 0 ? canvas : {
      min: Math.max(
        this.renderer.getPixelPosition(file.timestamp.min + file.settings.offset),
        this.renderer.getPixelPosition(lastEvent.timestamp + file.settings.offset),
        canvas.min,
      ),
      max: Math.min(
        this.renderer.getPixelPosition(file.timestamp.max + file.settings.offset),
        this.renderer.getPixelPosition(firstEvent.timestamp + file.settings.offset),
        canvas.max,
      ),
    }

    const getTimestampForPixel = (x: number): number => {
      const visibleWidth = this.renderer.ctx.canvas.width * this.renderer.info.app.timeline.scale
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
        const currentTimestamp = events[mid].timestamp + file.settings.offset
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
      }
      // Incrementally update from the last known length — no recursion needed
      this.computeRanges(file, cache[Hardcode.Length]);
    } else {
      this.computeRanges(file);
    }
    return RenderEngine[CacheKey].range.get(file.id)!;
  }

  computeRanges(file: Source.Type, skip: number = 0) {
    const allEvents = Source.Entity.events(this.renderer.info.app, file);
    const cache = RenderEngine[CacheKey].range.get(file.id);

    // When skip > 0 we extend an existing range; otherwise start fresh.
    // Using a for loop from `skip` avoids allocating a slice copy of the array.
    const range = skip > 0 && cache
      ? { min: cache.min, max: cache.max, field: cache.field }
      : { min: Infinity, max: -Infinity, field: file.settings.field };

    for (let i = skip; i < allEvents.length; i++) {
      const value = Refractor.any.toNumber(allEvents[i][file.settings.field]);
      if (value > range.max) range.max = value;
      if (value < range.min) range.min = value;
    }

    RenderEngine[CacheKey].range.set(file.id, {
      ...range,
      [Hardcode.Length]: allEvents.length
    });

    Logger.log(`RenderEngine cache ranges for file ${file.id} has been recalculated`, DefaultEngine.name);
  }

  is = (file: Source.Type) => Boolean(this.map.get(file.id)?.[Hardcode.Scale] === this.renderer.info.app.timeline.scale);
}
