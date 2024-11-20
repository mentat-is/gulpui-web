import { λFile } from "@/dto/File.dto";
import { Engine, EngineConstructor } from "./Engine.dto";
import { RenderEngine, Scale } from "./RenderEngine";
import { throwableByTimestamp } from "@/ui/utils";
import { File } from "./Info";

type Target = Map<number, number> & Scale;

type Targets = Map<λFile['uuid'], Target>;

export class DefaultEngine implements Engine {
  private map: Targets = new Map() as Targets;
  private renderer: RenderEngine;

  constructor(renderer: EngineConstructor) {
    this.renderer = renderer;
  }

  public render(file: λFile, y: number, force?: boolean) {
    const map = this.map.get(file.uuid);

    Array.from(heat.entries()).forEach(([hit, ]) => {
      const { code, timestamp } = hit;
      const λpos = this.renderer.getPixelPosition(timestamp);
      if (throwableByTimestamp(timestamp + file.offset, this.limits, this.info.app)) return;

      this.ctx.fillStyle = λColor.gradient(file.color, code, {
        min: file.event.min,
        max: file.event.max,
      });
      this.ctx.fillRect(this.getPixelPosition(timestamp), y, 1, 47);
    });
  }
  
  private get(file: λFile) {
    if (this.is(file)) return this.map.get(file.uuid)!;

    const map: Target = new Map() as Target;

    File.events(this.renderer.info.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset;
      

      map.set(timestamp, parseInt(event.event.code) || file.event.max);
    });

    map[Scale] = this.info.app.timeline.scale;
    this.map.set(file.uuid, map)

    return map;
  };
  
  private is(file: λFile) {
    return Boolean(this.map.get(file.uuid));
  }
}
