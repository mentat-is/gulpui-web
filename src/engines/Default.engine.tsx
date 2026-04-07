import { Engine, Hardcode, CacheKey } from '../class/Engine.dto'
import { RenderEngine } from '../class/RenderEngine'
import { Refractor } from '@/ui/utils'
import { MinMax } from '@/class/Info'
import { Logger } from '@/dto/Logger.class'
import { Source } from '@/entities/Source'
import { Color } from '@/entities/Color'
import { Doc } from '@/entities/Doc'

export class DefaultEngine implements Engine.Interface<any> {
  static instance: DefaultEngine | null = null
  private renderer!: RenderEngine

  map = new Map<Source.Id, any>()

  constructor(renderer: Engine.Constructor) {
    if (DefaultEngine.instance) {
      DefaultEngine.instance.renderer = renderer
      return DefaultEngine.instance
    }
    this.renderer = renderer
    DefaultEngine.instance = this
  }

  get: (file: Source.Type) => any = () => {}

  updateRenderer(renderer: Engine.Constructor) {
    this.renderer = renderer
  }

  render(file: Source.Type, y: number, force?: boolean) {
    console.log(`render: ${file.name}`)
    console.trace()
    const events = Source.Entity.events(this.renderer.info.app, file);
    if (!events || events.length === 0) return;

    const range = this.getRanges(file);

    // Precompute hot-loop constants — avoids repeated property-chain traversal
    const ctx = this.renderer.ctx;
    const offset = file.settings.offset;
    const palette = file.settings.render_color_palette;
    const field = file.settings.field;
    const scrollX = this.renderer.scrollX;
    // Use ctx.canvas.width * scale (same denominator as getTimestamp), not Info.width
    // which queries the DOM and may differ if the canvas element ID lookup fails.
    const visibleWidth = ctx.canvas.width * this.renderer.info.app.timeline.scale;
    const frame = this.renderer.info.app.timeline.frame;
    const frameMin = frame.min;
    const frameRange = frame.max - frameMin;

    const minTimestampVisible = this.renderer.getTimestamp(-50) - offset;
    const maxTimestampVisible = this.renderer.getTimestamp(ctx.canvas.width + 50) - offset;

    // Events are stored in DESCENDING timestamp order (newest first).
    // Binary searches must account for this.

    // Find startIdx: smallest index where events[mid].timestamp <= maxTimestampVisible
    // (first event in the visible window, i.e. highest timestamp that is still on-screen)
    let startIdx = events.length; // default: nothing visible
    let left = 0, right = events.length - 1;
    while (left <= right) {
      const mid = (left + right) >>> 1;
      if (events[mid].timestamp <= maxTimestampVisible) {
        startIdx = mid;
        right = mid - 1; // try smaller index (higher timestamps live at lower indices)
      } else {
        left = mid + 1;
      }
    }
    if (startIdx === events.length) return;

    // Find endIdx: largest index where events[mid].timestamp >= minTimestampVisible
    // (last event in the visible window, i.e. lowest timestamp still on-screen)
    let endIdx = -1;
    left = startIdx;
    right = events.length - 1;
    while (left <= right) {
      const mid = (left + right) >>> 1;
      if (events[mid].timestamp >= minTimestampVisible) {
        endIdx = mid;
        left = mid + 1; // try larger index (lower timestamps live at higher indices)
      } else {
        right = mid - 1;
      }
    }
    if (endIdx === -1) return;

    let i = startIdx;

    while (i <= endIdx) {
      const timestamp = events[i].timestamp + offset;

      // Safety guard: skip events outside the selection frame
      if (timestamp > frame.max || timestamp < frame.min) {
        i++;
        continue;
      }

      const x = this.renderer.getPixelPosition(timestamp);

      const code = Refractor.any.toNumber(Refractor.get(events[i], field));
      this.renderer.ctx.fillStyle = Color.Entity.gradient(palette, code, range);
      this.renderer.ctx.fillRect(x, y, 1, 47);

      // SKIP-AHEAD: events are descending in timestamp, so as i increases, x decreases.
      // After drawing pixel x, skip to the first event that maps to a pixel strictly
      // below x. Events at pixel x satisfy:
      //   timestamp >= frameMin + (x - 0.5 + scrollX) / visibleWidth * frameRange - offset
      // Events at pixel < x have timestamp below that threshold.
      // This reduces iterations from O(N_visible) to O(canvasWidth * log N).
      const nextThreshold = frameMin + (x - 0.5 + scrollX) / visibleWidth * frameRange - offset;

      let lo = i + 1, hi = endIdx, next = endIdx + 1;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (events[mid].timestamp < nextThreshold) {
          next = mid;
          hi = mid - 1; // try smaller index to find the first qualifying event
        } else {
          lo = mid + 1;
        }
      }
      i = next;
    }
  }

  getRanges(file: Source.Type): MinMax {
    const events = Source.Entity.events(this.renderer.info.app, file);
    const cache = RenderEngine[CacheKey].range.get(file.id);

    if (cache && cache.field === file.settings.field) {
      if (cache[Hardcode.Length] === events.length) {
        return cache;
      } else {
        this.computeRanges(file, cache[Hardcode.Length]);
      }
    }

    this.computeRanges(file);
    return this.getRanges(file);
  }

  computeRanges(file: Source.Type, skip: number = 0) {
    const events = Source.Entity.events(this.renderer.info.app, file);
    const cache = RenderEngine[CacheKey].range.get(file.id);

    const range = skip > 0 && cache ? cache : {
      min: Infinity,
      max: -Infinity,
      field: file.settings.field
    };

    for (let i = skip; i < events.length; i++) {
      const value = Refractor.any.toNumber(Refractor.get(events[i], file.settings.field));
      if (value > range.max) range.max = value;
      if (value < range.min) range.min = value;
    }

    RenderEngine[CacheKey].range.set(file.id, {
      ...range,
      [Hardcode.Length]: events.length
    });

    Logger.log(`RenderEngine cache ranges for file ${file.id} has been recalculated`, DefaultEngine.name);
  }

  is = (file: Source.Type) => false;
}
