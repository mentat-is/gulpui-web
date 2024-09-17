import { λFile } from "@/dto/File.dto";
import { MinMax } from "@/dto/QueryMaxMin.dto";
import { File } from "./Info";
import { Info } from "@/dto";
import { getColorByCode, getDispersionFromColorByDelta, throwableByTimestamp } from "@/ui/utils";
import { Engine } from "@/dto/Engine.dto";

const scale = Symbol('scale');

interface RenderEngineConstructor {
  ctx: CanvasRenderingContext2D,
  limits: MinMax,
  app: Info,
  getPixelPosition: (timestamp: number) => number
}

export interface Heat {
  amount: number,
  color: string,
  height: number,
  timestamp: number
}

export type HeightMap = Map<number, Heat> & Scale;

export interface Status {
  codes: number[],
  colors: string[],
  timestamp: number,
  heights: number[]
}

export type StatusMap = Map<number, Status> & Scale;

export interface Default {
  timestamp: number,
  amount: number
}

export interface Scale {
  [scale]: number
}

export type DefaultMap = Map<number, Default> & Scale;

type Engines = {
  [key in Engine]: (file: λFile, y: number) => void;
};

export class RenderEngine implements RenderEngineConstructor, Engines {
  ctx!: CanvasRenderingContext2D;
  limits!: MinMax;
  app!: Info;
  getPixelPosition!: (timestamp: number) => number;
  heightMap: Record<λFile['name'], HeightMap> = {};
  statusMap: Record<λFile['name'], StatusMap> = {};
  defaultMap: Record<λFile['name'], DefaultMap> = {};
  private static instance: RenderEngine | null = null;

  constructor({ ctx, limits, app, getPixelPosition }: RenderEngineConstructor) {
    if (RenderEngine.instance) {
      RenderEngine.instance.ctx = ctx;
      RenderEngine.instance.limits = limits;
      RenderEngine.instance.app = app;
      RenderEngine.instance.getPixelPosition = getPixelPosition;
      return RenderEngine.instance;
    }

    this.ctx = ctx;
    this.limits = limits;
    this.app = app;
    this.getPixelPosition = getPixelPosition;
    RenderEngine.instance = this;
  }

  default(file: λFile, y: number) {
    const heat = this.process(this.defaultMap, file)
      ? this.defaultMap[file.name]
      : this.getDefault(file);

    const max = Math.max(...[...heat.values()].map(v => v.amount));

    [...heat].forEach(hit => {
      const [_, { amount, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp, this.limits)) return;

      this.ctx.fillStyle = getDispersionFromColorByDelta(file.color, amount, max);
      this.ctx.fillRect(this.getPixelPosition(timestamp), y, 1, 47);
    });
  }
  
  async height(file: λFile, y: number) {
    const heat = this.process(this.heightMap, file)
      ? this.heightMap[file.name]
      : await this.getHeightmap(file);

    [...heat].forEach((hit) => {
      const [_, { color, height, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp, this.limits)) return;

      this.ctx.fillStyle = color;
      this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47, 1, -height);
    });
  };
  
  graph = (file: λFile, y: number) => this.default(file, y);

  async apache(file: λFile, y: number) {
    const heat = this.process(this.statusMap, file) ? this.statusMap[file.name] : await this.getStatusMap(file);

    [...heat].forEach(hit => {
      const [_, { codes, colors, heights, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp, this.limits)) return;

      codes.map((code, i) => {
        this.ctx.fillStyle = colors[i];
        this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47 - heights[i], 1, 1);
      })
    });
  };

  private getDefault = (file: λFile): DefaultMap => {
    const heat: DefaultMap = new Map() as DefaultMap;

    File.events(this.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset;
      const λpos = this.getPixelPosition(timestamp);

      const obj: Default = heat.get(λpos) || {
        amount: 0,
        timestamp
      };

      heat.set(λpos, {
        amount: obj.amount + 1,
        timestamp
      });
    });

    heat[scale] = this.app.timeline.scale;
    this.defaultMap = {
      ...this.defaultMap,
      [file.name]: heat
    };

    return heat;
  }

  private getHeightmap = (file: λFile): HeightMap => {
    const heat: HeightMap = new Map() as HeightMap;

    File.events(this.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset;
      const λpos = this.getPixelPosition(timestamp);

      const obj: Heat = heat.get(λpos) || {
        amount: 0,
        color: '#ffffff',
        height: 1,
        timestamp
      };

      const amount = obj.amount + 1;

      const max = Math.max(...[...heat.values(), { ...obj, amount }].map(v => v.amount));

      heat.set(λpos, {
        color: `rgb(${Math.min(255, Math.floor(255 * (amount / max)))}, ${Math.min(255, Math.floor(255 * (1 - amount / max)))}, 0)`,
        amount,
        height: 1 + (47 - 1) * (amount / max),
        timestamp
      });
    });

    heat[scale] = this.app.timeline.scale;
    this.heightMap = {
      ...this.heightMap,
      [file.name]: heat
    };
  
    return heat;
  };

  private getStatusMap = (file: λFile): StatusMap => {
    const heat: StatusMap = new Map() as StatusMap;

    File.events(this.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset;
      const λpos = this.getPixelPosition(timestamp);

      const code = parseInt(event.event.code);

      const obj: Status = heat.get(λpos) || {
        codes: [],
        colors: [],
        heights: [],
        timestamp
      };

      heat.set(λpos, {
        colors: [...obj.colors, getColorByCode(code, file.event.min, file.event.max)],
        codes: [...obj.codes, code],
        heights: [...obj.heights, Math.round(((code - file.event.min) / (file.event.max - file.event.min)) * 46 + 1)],
        timestamp
      });
    });

    heat[scale] = this.app.timeline.scale;
    this.statusMap = {
      ...this.statusMap,
      [file.name]: heat,
    };
  
    return heat;
  }

  private process = (map: Record<string, StatusMap | DefaultMap | HeightMap>, file: λFile): boolean => Boolean(map[file.name]?.[scale] === this.app.timeline.scale && file.doc_count === File.events(this.app, file).length);
}
