import { λFile } from '@/dto/Dataset';
import { Engine, Hardcode, MaxHeight, MinHeight, Scale } from '../class/Engine.dto';
import { RenderEngine } from '../class/RenderEngine';
import { getTimestamp, Gradients, numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine, throwableByTimestamp, λColor } from '@/ui/utils';
import { File, MinMax } from '@/class/Info';

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

    Array.from(map.entries()).forEach(([_, [ code, timestamp ]]) => {
      if (throwableByTimestamp(timestamp + file.settings.offset, this.renderer.limits, this.renderer.info.app)) return;

      const position = this.renderer.getPixelPosition(timestamp);

      this.renderer.ctx.fillStyle = λColor.gradient(file.settings.color, code, {
        min: map[MinHeight],
        max: map[MaxHeight],
      });

      this.renderer.ctx.fillRect(position, y, 1, 47);
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
    console.log({ pixels });

    const mustHave = pixels.max - pixels.min;

    console.log({ mustHave });

    for (let x = 0; x < mustHave; x++) {
      let low = 0, high = events.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        const eventTime = events[mid]?.timestamp + file.settings.offset;
        
        if (this.renderer.getPixelPosition(eventTime) < x) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }

      console.log(high, low);

      if (low < events.length) {
        const event = events[low];
        const eventTime = event.timestamp + file.settings.offset;
        const value = parseInt(event[file.settings.field].toString());
        map.set(x as Hardcode.X, [
          value as Hardcode.Height,
          eventTime as Hardcode.Timestamp
        ]);
      }
    }

    if (file.name === 'testapache.log') {
      console.log(map); // Размер 245 пикселей, больее 2 миллионов ивентов, после аглорисма size: 0;
    }

    map[Scale] = this.renderer.info.app.timeline.scale as Hardcode.Scale;
    map[MinHeight] = file.code.min as Hardcode.Height;
    map[MaxHeight] = file.code.max as Hardcode.Height;
    this.map.set(file.id, map);

    return map as typeof DefaultEngine.target;
  };
  
  is = (file: λFile) => Boolean(this.map.get(file.id)?.[Scale] === this.renderer.info.app.timeline.scale);
}
