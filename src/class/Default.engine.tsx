import { λFile } from "@/dto/File.dto";
import { Engine, Hardcode, Scale } from "./Engine.dto";
import { RenderEngine } from "./RenderEngine";
import { throwableByTimestamp, λColor } from "@/ui/utils";
import { File, μ } from "./Info";

export class DefaultEngine implements Engine.Interface<typeof DefaultEngine.target> {
  private static instance: DefaultEngine | null = null;
  static target: Map<number, number> & Scale;
  private renderer!: RenderEngine;
  map = new Map<μ.File, typeof DefaultEngine.target>();

  constructor(renderer: Engine.Constructor) {
    if (DefaultEngine.instance) {
      console.log(DefaultEngine.instance);
      DefaultEngine.instance.renderer = renderer;
      return DefaultEngine.instance;
    }

    this.renderer = renderer;
    DefaultEngine.instance = this;
  }

  render(file: λFile, y: number) {
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
  
  get(file: λFile): typeof DefaultEngine.target {
    if (this.is(file)) return this.map.get(file.uuid)! as typeof DefaultEngine.target;

    const map = new Map() as typeof DefaultEngine.target;
    const cache = new Set<number>();

    File.events(this.renderer.info.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset;
      const pos = this.renderer.getPixelPosition(timestamp);

      if (cache.has(pos))
        return;

      cache.add(pos);
      map.set(timestamp, parseInt(event.event.code) || file.event.max);
    });

    map[Scale] = this.renderer.info.app.timeline.scale as Hardcode.Scale;
    this.map.set(file.uuid, map)

    return map as typeof DefaultEngine.target;
  };
  
  is = (file: λFile) => Boolean(this.map.get(file.uuid)?.[Scale] === this.renderer.info.app.timeline.scale);
}
