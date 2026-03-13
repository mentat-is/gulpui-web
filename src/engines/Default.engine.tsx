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
    const events = Source.Entity.events(this.renderer.info.app, file);
    if (!events || events.length === 0) return;

    const range = this.getRanges(file);

    const minTimestampVisible = this.renderer.getTimestamp(-50) - file.settings.offset;
    const maxTimestampVisible = this.renderer.getTimestamp(this.renderer.ctx.canvas.width + 50) - file.settings.offset;

    let startIdx = 0;
    let left = 0, right = events.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (events[mid].timestamp >= minTimestampVisible) {
        startIdx = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    let endIdx = events.length - 1;
    left = startIdx;
    right = events.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (events[mid].timestamp <= maxTimestampVisible) {
        endIdx = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    let lastRenderedX = -Infinity;

    for (let i = startIdx; i <= endIdx; i++) {
      const event = events[i];
      let timestamp = event.timestamp + file.settings.offset;

      if (timestamp > this.renderer.info.app.timeline.frame.max || timestamp < this.renderer.info.app.timeline.frame.min) {
        continue;
      }

      const x = this.renderer.getPixelPosition(timestamp);

      if (x === lastRenderedX) continue;
      lastRenderedX = x;

      const code = Refractor.any.toNumber(event[file.settings.field]);
      this.renderer.ctx.fillStyle = Color.Entity.gradient(file.settings.render_color_palette, code, range);

      this.renderer.ctx.fillRect(x, y, 1, 47);
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
      const value = Refractor.any.toNumber(events[i][file.settings.field]);
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