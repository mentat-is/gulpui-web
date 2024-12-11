import { λFile } from "@/dto/File.dto";
import { End, Engine, Hardcode, Length, MaxHeight, Scale, Start, StartEnd } from "../class/Engine.dto";
import { Dot, RenderEngine } from "../class/RenderEngine";
import { throwableByTimestamp, λColor } from "@/ui/utils";
import { Event } from "../class/Info";
import { HeightEngine } from "./Height.engine";

type Target = typeof HeightEngine.target & MaxHeight & Length & Scale & StartEnd;

export class GraphEngine implements Engine.Interface<Target> {
  private renderer: RenderEngine;
  map = new Map<λFile['uuid'], Target>();

  constructor(renderer: Engine.Constructor) {
    this.renderer = renderer;
  }

  public render(file: λFile, _y: number) {
    // const map = this.is(file)
    //   ? this.renderer.height.map.get(file.uuid)
    //   : this.get(file);

    const map = this.map.get(file.uuid);
  
    const graphs = (
      map &&
      map[Scale] === this.renderer.info.app.timeline.scale && 
      map[Start] > this.renderer.limits.max && 
      map[End] > this.renderer.limits.min
    ) ? this.map.get(file.uuid)! : this.get(file);

    const max = graphs[MaxHeight];
  
    let last: Dot | null = null;

    for (const [timestamp, height] of graphs) {
      const x = this.renderer.getPixelPosition(timestamp);
      const y = _y + 47 - Math.floor((height / max) * 47);
      const color = λColor.gradient(file.color, height, { min: 0, max });

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
  
  get(file: λFile): Target {
    const result = new Map() as Target;

    for (const [timestamp, height] of Array.from(this.renderer.height.get(file).entries())) {
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

    this.map.set(file.uuid, result);

    return result;
  };
  
  is(file: λFile) {
    const length = this.map.get(file.uuid)?.[Length]
    
    return Boolean(length && length >= Event.get(this.renderer.info.app, file.uuid).length);
  }
}
