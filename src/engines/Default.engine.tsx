import { λSource } from "@/dto/Operation.dto";
import { Engine, Hardcode, MaxHeight, MinHeight, Scale } from "../class/Engine.dto";
import { RenderEngine } from "../class/RenderEngine";
import { Gradients, numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine, throwableByTimestamp, λColor } from "@/ui/utils";
import { Source } from "@/class/Info";

export class DefaultEngine implements Engine.Interface<typeof DefaultEngine.target> {
  private static instance: DefaultEngine | null = null;
  static target: Map<Hardcode.X, [ Hardcode.Height, Hardcode.Timestamp ]> & Scale & MinHeight & MaxHeight;
  private renderer!: RenderEngine;
  map = new Map<λSource['id'], typeof DefaultEngine.target>();

  constructor(renderer: Engine.Constructor) {
    if (DefaultEngine.instance) {
      DefaultEngine.instance.renderer = renderer;
      return DefaultEngine.instance;
    }

    this.renderer = renderer;
    DefaultEngine.instance = this;
  }

  render(source: λSource, y: number, force?: boolean) {
    const map = this.get(source, force);

    Array.from(map.entries()).forEach(([_, [ code, timestamp ]]) => {
      if (throwableByTimestamp(timestamp + source.settings.offset, this.renderer.limits, this.renderer.info.app)) return;

      const position = this.renderer.getPixelPosition(timestamp);

      this.renderer.ctx.fillStyle = λColor.gradient(source.settings.color as Gradients, code, {
        min: Math.min(map[MinHeight], source.detailed.event.min),
        max: Math.max(map[MaxHeight], source.detailed.event.min),
      });
      this.renderer.ctx.fillRect(position, y, 1, 47);
    });
  }
  
  get(source: λSource, force?: boolean): typeof DefaultEngine.target {
    if (this.is(source) && !force) return this.map.get(source.id)! as typeof DefaultEngine.target;

    const map = new Map() as typeof DefaultEngine.target;

    Source.events(this.renderer.info.app, source).forEach(event => {
      const timestamp = event.timestamp + source.settings.offset as Hardcode.Timestamp;
      const pos = this.renderer.getPixelPosition(timestamp) as Hardcode.X;

      if (map.has(pos))
        return;

      const value = numericRepresentationOfAnyValueOnlyForInternalUsageOfRenderEngine(source, event);

      map.set(pos, [value, timestamp]);
    });

    const values = Array.from(map).map(v => v[1][0]);

    map[Scale] = this.renderer.info.app.timeline.scale as Hardcode.Scale;
    map[MinHeight] = Math.min(...values) as Hardcode.Height;
    map[MaxHeight] = Math.max(...values) as Hardcode.Height;
    this.map.set(source.id, map)

    return map as typeof DefaultEngine.target;
  };
  
  is = (source: λSource) => Boolean(this.map.get(source.id)?.[Scale] === this.renderer.info.app.timeline.scale);
}
