import { λFile } from "@/dto/File.dto";
import { Engine, Hardcode, Length, MaxHeight } from "./Engine.dto";
import { RenderEngine } from "./RenderEngine";
import { throwableByTimestamp, λColor } from "@/ui/utils";
import { Event, File } from "./Info";

type Target = Map<number, number> & MaxHeight & Length;

export class HeightEngine implements Engine.Interface<Target> {
  private renderer: RenderEngine;
  map = new Map();

  constructor(renderer: Engine.Constructor) {
    this.renderer = renderer;
  }

  public render(file: λFile, y: number) {
    const map = this.get(file);
    const max = map[MaxHeight];
    
    Array.from(map.entries()).forEach(([timestamp, amount]) => {
      if (throwableByTimestamp(timestamp + file.offset, this.renderer.limits, this.renderer.info.app)) return;
    
      this.renderer.ctx.fillStyle = λColor.gradient(file.color, amount, {
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
  
  get(file: λFile): Target {
    if (this.is(file)) return this.map.get(file.uuid)! as Target;

    const map = new Map() as Target;

    File.events(this.renderer.info.app, file).forEach(event =>
      map.set(event.timestamp, (map.get(event.timestamp) || 0) + 1));

    map[Length] = Event.get(this.renderer.info.app, file.uuid).length as Hardcode.Length;
    let maxHeight = -Infinity;
    for (const value of map.values()) {
      if (value > maxHeight) {
        maxHeight = value;
      }
    }
    map[MaxHeight] = maxHeight as Hardcode.Height;
    this.map.set(file.uuid, map);

    return map;
  };
  
  is(file: λFile) {
    const length = this.map.get(file.uuid)?.[Length]
    
    return Boolean(length && length >= Event.get(this.renderer.info.app, file.uuid).length);
  }
}
