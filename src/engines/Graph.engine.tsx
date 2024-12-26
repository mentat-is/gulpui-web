import { End, Engine, Hardcode, Length, MaxHeight, Scale, Start, StartEnd } from "../class/Engine.dto";
import { Dot, RenderEngine } from "../class/RenderEngine";
import { Gradients, throwableByTimestamp, λColor } from "@/ui/utils";
import { Event } from "../class/Info";
import { HeightEngine } from "./Height.engine";
import { λSource } from "@/dto/Operation.dto";

type Target = typeof HeightEngine.target & MaxHeight & Length & Scale & StartEnd;

export class GraphEngine implements Engine.Interface<Target> {
  private renderer: RenderEngine;
  map = new Map<λSource['id'], Target>();

  constructor(renderer: Engine.Constructor) {
    this.renderer = renderer;
  }

  public render(source: λSource, _y: number) {
    // const map = this.is(source)
    //   ? this.renderer.height.map.get(source.id)
    //   : this.get(source);

    const map = this.map.get(source.id);
  
    const graphs = (
      map &&
      map[Scale] === this.renderer.info.app.timeline.scale && 
      map[Start] > this.renderer.limits.max && 
      map[End] > this.renderer.limits.min
    ) ? this.map.get(source.id)! : this.get(source);

    const max = graphs[MaxHeight];
  
    let last: Dot | null = null;

    for (const [timestamp, height] of graphs) {
      const x = this.renderer.getPixelPosition(timestamp);
      const y = _y + 47 - Math.floor((height / max) * 47);
      const color = λColor.gradient(source.color as Gradients, height, { min: 0, max });

      this.renderer.ctx.font = `8px Arial`;
      this.renderer.ctx.fillStyle = color;
      this.renderer.ctx.fillText(height.toString(), x - 3.5, y - 8);

      const dot = { x, y, color };

      if (last) {
        this.renderer.connection([dot, last]);
      }

      last = dot;
      this.renderer.dot(dot);
    };
  }
  
  get(source: λSource): Target {
    const result = new Map() as Target;

    for (const [timestamp, height] of Array.from(this.renderer.height.get(source).entries())) {
      if (throwableByTimestamp(timestamp, {
        min: this.renderer.limits.min - 3000,
        max: this.renderer.limits.max + 3000,
      }, this.renderer.info.app)) continue;
    
      const x = this.renderer.getPixelPosition(timestamp);
      const [lastTimestamp, lastHeight] = Array.from(result).pop() || [];
    
      if (lastTimestamp && lastHeight) {
        const lastX = this.renderer.getPixelPosition(lastTimestamp);

        if (Math.abs(x - lastX) > 16) {
          const steps = Math.floor(Math.abs(x - lastX) / 16);
          const deltaTimestamp = (timestamp - lastTimestamp) / (steps + 1);
    
          for (let i = 1; i <= steps; i++)
            result.set(lastTimestamp + deltaTimestamp * i, 0 as Hardcode.Height);
        }
      }
    
      if (lastTimestamp && lastHeight && Math.abs(this.renderer.getPixelPosition(lastTimestamp) - x) < 8) {
        result.set(lastTimestamp, lastHeight + height as Hardcode.Height);
      } else {
        result.set(timestamp, height);
      }
    }    

    const max = Math.max(...Array.from(result).map(v => v[1]));

    
    result[Scale] = this.renderer.info.app.timeline.scale as Hardcode.Scale;
    result[MaxHeight] = max as Hardcode.Height;
    result[Start] = (Array.from(result)[0]?.[0] || 0) as Hardcode.Timestamp;
    result[End] = (Array.from(result).pop()?.[0] || 0) as Hardcode.Timestamp;

    this.map.set(source.id, result);

    return result;
  };
  
  is(source: λSource) {
    const length = this.map.get(source.id)?.[Length]
    
    return Boolean(length && length >= Event.get(this.renderer.info.app, source.id).length);
  }
}
