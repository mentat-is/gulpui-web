import { λFile } from "@/dto/File.dto";
import { Engine, Hardcode, Scale } from "./Engine.dto";
import { RenderEngine } from "./RenderEngine";
import { throwableByTimestamp, λColor } from "@/ui/utils";
import { File } from "./Info";

type Target = Map<number, number> & Scale;

export class DefaultEngine implements Engine.Interface<Target> {
  private renderer: RenderEngine;
  map = new Map();

  constructor(renderer: Engine.Constructor) {
    this.renderer = renderer;
  }

  public render(file: λFile, y: number) {
    const map = this.get(file);

    Array.from(map.entries()).forEach(([timestamp, code]) => {
      if (throwableByTimestamp(timestamp + file.offset, this.renderer.limits, this.renderer.info.app)) return;

      const position = this.renderer.getPixelPosition(timestamp);

      this.renderer.ctx.fillStyle = λColor.gradient(file.color, code, {
        min: file.event.min,
        max: file.event.max,
      });
      this.renderer.ctx.fillRect(position, y, 1, 47);
    });
  }
  
  get(file: λFile): Target {
    if (this.is(file)) return this.map.get(file.uuid)! as Target;

    const map = new Map() as Target;

    File.events(this.renderer.info.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset;
      

      map.set(timestamp, parseInt(event.event.code) || file.event.max);
    });

    map[Scale] = this.renderer.info.app.timeline.scale as Hardcode.Scale;
    this.map.set(file.uuid, map)

    return map as Target;
  };
  
  is(file: λFile) {
    Boolean(this.map.get(file.uuid)?.[Scale] === this.renderer.info.app.timeline.scale)
    return Boolean(this.map.get(file.uuid));
  }
}
