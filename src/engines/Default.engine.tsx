import { λFile } from '@/dto/Dataset';
import { Engine, Hardcode, MaxHeight, MinHeight, Scale } from '../class/Engine.dto';
import { RenderEngine } from '../class/RenderEngine';
import { getTimestamp, Gradients, numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine, throwableByTimestamp, λColor } from '@/ui/utils';
import { File, MinMax } from '@/class/Info';
import { arrayBuffer } from 'stream/consumers';

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

  binarySearch(haystack: Event[], needle: number): number {
    let low = 0;
    let high = haystack.length - 1;
  
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (haystack[mid].timeStamp === needle) {
        return mid;
      } else if (haystack[mid].timeStamp < needle) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return -1; // needle not found
  }

  render(file: λFile, y: number, force?: boolean) {
    const map = this.get(file, force);

    const events = Array.from(map.entries());

    events.forEach(([x, [ code, timestamp ]]) => {
      this.renderer.ctx.fillStyle = λColor.gradient(file.settings.color, code, {
        min: map[MinHeight],
        max: map[MaxHeight],
      });

      this.renderer.ctx.fillRect(x, y, 1, 47);
    });
  }
  
  get(file: λFile, force?: boolean): typeof DefaultEngine.target {
    if (this.is(file) && !force) return this.map.get(file.id)! as typeof DefaultEngine.target;

    const map = new Map() as typeof DefaultEngine.target;
    const events = File.events(this.renderer.info.app, file);
    const { width } = this.renderer.ctx.canvas;
    const pixels: MinMax = {
      min: Math.max(this.renderer.getPixelPosition(file.timestamp.min), 0),
      max: Math.min(this.renderer.getPixelPosition(file.timestamp.max), width),
    }

    for (let x = pixels.min; x < pixels.max; x++) {
      let index = 0;
      let step = Math.max(1, Math.floor(events.length / 100));
    
      while (step >= 1) {
        if (index + step < events.length) {
          const eventTime = events[index + step].timestamp + file.settings.offset;
          console.log(this.renderer.getPixelPosition(eventTime));
          if (this.renderer.getPixelPosition(eventTime) < x) {
            index += step;
          }
        }
        step = Math.floor(step / 2);
      }
    
      let low = index, high = Math.min(events.length - 1, index + step * 2);
    
      while (low < high) {
        const mid = (low + high) >>> 1;
        const eventTime = events[mid].timestamp + file.settings.offset;

        if (this.renderer.getPixelPosition(eventTime) < x) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
    
      if (low < events.length) {
        const event = events[low];
        const eventTime = event.timestamp + file.settings.offset;
        const value = parseInt(event[file.settings.field].toString());

        console.log(low);
    
        map.set(x as Hardcode.X, [
          value as Hardcode.Height,
          eventTime as Hardcode.Timestamp
        ]);
      }
    }

    console.log(map);

    map[Scale] = this.renderer.info.app.timeline.scale as Hardcode.Scale;
    map[MinHeight] = file.code.min as Hardcode.Height;
    map[MaxHeight] = file.code.max as Hardcode.Height;
    this.map.set(file.id, map);

    return map as typeof DefaultEngine.target;
  };
  
  is = (file: λFile) => Boolean(this.map.get(file.id)?.[Scale] === this.renderer.info.app.timeline.scale);
}
