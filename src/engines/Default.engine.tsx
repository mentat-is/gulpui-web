import { λFile } from "@/dto/File.dto";
import { Engine, Hardcode, MaxHeight, MinHeight, Scale } from "../class/Engine.dto";
import { RenderEngine } from "../class/RenderEngine";
import { numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine, throwableByTimestamp, λColor } from "@/ui/utils";
import { File, μ } from "../class/Info";

export class DefaultEngine implements Engine.Interface<typeof DefaultEngine.target> {
  private static instance: DefaultEngine | null = null;
  static target: Map<Hardcode.X, [ Hardcode.Height, Hardcode.Timestamp ]> & Scale & MinHeight & MaxHeight;
  private renderer!: RenderEngine;
  map = new Map<μ.File, typeof DefaultEngine.target>();

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
      if (throwableByTimestamp(timestamp + file.offset, this.renderer.limits, this.renderer.info.app)) return;

      const position = this.renderer.getPixelPosition(timestamp);

      this.renderer.ctx.fillStyle = λColor.gradient(file.color, code, {
        min: Math.min(map[MinHeight], file.event.min),
        max: Math.max(map[MaxHeight], file.event.max),
      });
      this.renderer.ctx.fillRect(position, y, 1, 47);
    });
  }
  
  get(file: λFile, force?: boolean): typeof DefaultEngine.target {
    if (this.is(file) && !force) return this.map.get(file.uuid)! as typeof DefaultEngine.target;

    const map = new Map() as typeof DefaultEngine.target;

    File.events(this.renderer.info.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset as Hardcode.Timestamp;
      const pos = this.renderer.getPixelPosition(timestamp) as Hardcode.X;

      if (map.has(pos))
        return;

      const value = numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine(file, event);

      map.set(pos, [value, timestamp]);
    });

    const values = Array.from(map).map(v => v[1][0]);

    map[Scale] = this.renderer.info.app.timeline.scale as Hardcode.Scale;
    map[MinHeight] = Math.min(...values) as Hardcode.Height;
    map[MaxHeight] = Math.max(...values) as Hardcode.Height;
    this.map.set(file.uuid, map)

    return map as typeof DefaultEngine.target;
  };
  
  is = (file: λFile) => Boolean(this.map.get(file.uuid)?.[Scale] === this.renderer.info.app.timeline.scale);
}
