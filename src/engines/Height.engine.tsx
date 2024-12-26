import { Engine, Hardcode, Length, MaxHeight } from "../class/Engine.dto";
import { RenderEngine } from "../class/RenderEngine";
import { Gradients, throwableByTimestamp, λColor } from "@/ui/utils";
import { Event, Source } from "../class/Info";
import { λSource } from "@/dto/Operation.dto";

export class HeightEngine implements Engine.Interface<typeof HeightEngine.target> {
  static target: Map<number, number> & MaxHeight & Length;
  private renderer: RenderEngine;
  map = new Map<λSource['id'], typeof HeightEngine.target>();

  constructor(renderer: Engine.Constructor) {
    this.renderer = renderer;
  }

  render(source: λSource, y: number) {
    const map = this.get(source);
    const max = map[MaxHeight];
    
    Array.from(map.entries()).forEach(([timestamp, amount]) => {
      if (throwableByTimestamp(timestamp + source.settings.offset, this.renderer.limits, this.renderer.info.app)) return;
    
      this.renderer.ctx.fillStyle = λColor.gradient(source.settings.color as Gradients, amount, {
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
  
  get(source: λSource): typeof HeightEngine.target {
    if (this.is(source)) return this.map.get(source.id)! as typeof HeightEngine.target;

    const map = new Map() as typeof HeightEngine.target;

    Source.events(this.renderer.info.app, source).forEach(event =>
      map.set(event.timestamp, (map.get(event.timestamp) || 0) + 1));

    map[Length] = Event.get(this.renderer.info.app, source.id).length as Hardcode.Length;
    let maxHeight = -Infinity;
    for (const value of map.values()) {
      if (value > maxHeight) {
        maxHeight = value;
      }
    }
    map[MaxHeight] = maxHeight as Hardcode.Height;
    this.map.set(source.id, map);

    return map;
  };
  
  is(source: λSource) {
    const length = this.map.get(source.id)?.[Length]
    
    return Boolean(length && length >= Event.get(this.renderer.info.app, source.id).length);
  }
}
