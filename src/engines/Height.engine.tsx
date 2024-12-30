import { Engine, Hardcode, Length, MaxHeight } from '../class/Engine.dto';
import { RenderEngine } from '../class/RenderEngine';
import { Gradients, throwableByTimestamp, λColor } from '@/ui/utils';
import { Event, File } from '../class/Info';
import { λFile } from '@/dto/Dataset';

export class HeightEngine implements Engine.Interface<typeof HeightEngine.target> {
  static target: Map<number, number> & MaxHeight & Length;
  private renderer: RenderEngine;
  map = new Map<λFile['id'], typeof HeightEngine.target>();

  constructor(renderer: Engine.Constructor) {
    this.renderer = renderer;
  }

  render(file: λFile, y: number) {
    const map = this.get(file);
    const max = map[MaxHeight];
    
    Array.from(map.entries()).forEach(([timestamp, amount]) => {
      if (throwableByTimestamp(timestamp + file.settings.offset, this.renderer.limits, this.renderer.info.app)) return;
    
      this.renderer.ctx.fillStyle = λColor.gradient(file.settings.color as Gradients, amount, {
        min: 0,
        max,
      });
      
      this.renderer.ctx.fillRect(
        this.renderer.getPixelPosition(timestamp), 
        y + 47, 
        1, 
        -(1 + (47 - 1) * (amount / max))
      );
    })
  }
  
  get(file: λFile): typeof HeightEngine.target {
    if (this.is(file)) return this.map.get(file.id)! as typeof HeightEngine.target;

    const map = new Map() as typeof HeightEngine.target;

    File.events(this.renderer.info.app, file).forEach(event =>
      map.set(event.timestamp, (map.get(event.timestamp) || 0) + 1));

    map[Length] = Event.get(this.renderer.info.app, file.id).length as Hardcode.Length;
    let maxHeight = -Infinity;
    for (const value of map.values()) {
      if (value > maxHeight) {
        maxHeight = value;
      }
    }
    map[MaxHeight] = maxHeight as Hardcode.Height;
    this.map.set(file.id, map);

    return map;
  };
  
  is(file: λFile) {
    const length = this.map.get(file.id)?.[Length]
    
    return Boolean(length && length >= Event.get(this.renderer.info.app, file.id).length);
  }
}
