import { λFile } from '@/dto/Dataset';
import { Engine, Hardcode, MaxHeight, MinHeight, Scale } from '../class/Engine.dto';
import { RenderEngine } from '../class/RenderEngine';
import { getTimestamp, λColor } from '@/ui/utils';
import { File, MinMax } from '@/class/Info';
import { λEvent } from '@/dto/ChunkEvent.dto';

export class DefaultEngine implements Engine.Interface<typeof DefaultEngine.target> {
  private static instance: DefaultEngine | null = null;
  static target: Map<Hardcode.X, [ Hardcode.Height, Hardcode.Timestamp ]> & Scale & MinHeight & MaxHeight;
  private renderer!: RenderEngine;
  map = new Map<λFile['id'], typeof DefaultEngine.target>();

  constructor(renderer: Engine.Constructor) {
    if (DefaultEngine.instance) {
      DefaultEngine.instance.renderer = renderer;
      return DefaultEngine.instance;
    }

    this.renderer = renderer;
    DefaultEngine.instance = this;
  }

  render(file: λFile, y: number, force?: boolean) {
    const map = this.get(file, force);

    const events = Array.from(map.entries());

    events.forEach(([x, [ code, timestamp ]]) => {
      this.renderer.ctx.fillStyle = λColor.gradient(file.settings.color, code, {
        min: map[MinHeight],
        max: map[MaxHeight],
      });

      this.renderer.ctx.fillRect(this.renderer.getPixelPosition(timestamp), y, 1, 47);
    });
  }
  
  get(file: λFile, force?: boolean): typeof DefaultEngine.target {
    if (this.is(file) && !force) return this.map.get(file.id)! as typeof DefaultEngine.target;
  
    const map = new Map() as typeof DefaultEngine.target;
    const events = File.events(this.renderer.info.app, file);

    if (events.length === 0) {
      return map;
    }
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    
    const visiblePixelRange: MinMax = {
      min: Math.max(
        this.renderer.getPixelPosition(file.timestamp.min),
        this.renderer.getPixelPosition(lastEvent.timestamp),
        -100
      ),
      max: Math.min(
        this.renderer.getPixelPosition(file.timestamp.max),
        this.renderer.getPixelPosition(firstEvent.timestamp),
        this.renderer.ctx.canvas.width + 100
      )
    };

    console.log(visiblePixelRange);
  
    if (visiblePixelRange.min >= visiblePixelRange.max) {
      return map;
    }
  
    const getTimestampForPixel = (x: number): number => {
      const { min, max } = file.timestamp;
      const scrollX = this.renderer.scrollX;
    
      const visibleWidth = this.renderer.getPixelPosition(max) - this.renderer.getPixelPosition(min);
      const pixelOffset = x + scrollX;
    
      return min + (pixelOffset / visibleWidth) * (max - min);
    };    
  
    const findClosestEventIndex = (targetTimestamp: number): number => {
      let low = 0;
      let high = events.length - 1;
      let closestIndex = 0;
      let closestDiff = Infinity;
  
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const currentTimestamp = events[mid].timestamp;
        const diff = Math.abs(currentTimestamp - targetTimestamp);
  
        if (diff < closestDiff || (diff === closestDiff && mid < closestIndex)) {
          closestDiff = diff;
          closestIndex = mid;
        }
  
        if (currentTimestamp > targetTimestamp) {
          low = mid + 1;
        } else if (currentTimestamp < targetTimestamp) {
          high = mid - 1;
        } else {
          return mid;
        }
      }
  
      for (let offset = -1; offset <= 1; offset++) {
        const idx = closestIndex + offset;
        if (idx >= 0 && idx < events.length) {
          const diff = Math.abs(events[idx].timestamp - targetTimestamp);
          if (diff < closestDiff || (diff === closestDiff && idx < closestIndex)) {
            closestDiff = diff;
            closestIndex = idx;
          }
        }
      }
  
      return closestIndex;
    };
  
    for (let x = visiblePixelRange.min; x < visiblePixelRange.max; x++) {
      const targetTimestamp = getTimestampForPixel(x);
      const closestIndex = findClosestEventIndex(targetTimestamp);
      
      const event = events[closestIndex];
      map.set(x as Hardcode.X, [
        parseInt(event[file.settings.field].toString()) as Hardcode.Height,
        event.timestamp as Hardcode.Timestamp
      ]);
    }  

    map[Scale] = this.renderer.info.app.timeline.scale as Hardcode.Scale;
    map[MinHeight] = file.code.min as Hardcode.Height;
    map[MaxHeight] = file.code.max as Hardcode.Height;
    this.map.set(file.id, map);

    return map as typeof DefaultEngine.target;
  };
  
  is = (file: λFile) => Boolean(this.map.get(file.id)?.[Scale] === this.renderer.info.app.timeline.scale);
}
