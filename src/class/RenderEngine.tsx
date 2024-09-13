import { λFile } from "@/dto/File.dto";
import { MinMax } from "@/dto/QueryMaxMin.dto";
import { File } from "./Info";
import { Info } from "@/dto";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { getColorByCode, throwableByTimestamp } from "@/ui/utils";
import { Engine } from "@/dto/Engine.dto";

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

export type Heatmap = Map<number, Heat>;

export interface Status {
  codes: number[],
  colors: string[],
  timestamp: number,
  heights: number[]
}

export type StatusMap = Map<number, Status>;

type Engines = {
  [key in Engine]: (file: λFile, y: number) => void;
};

const scale = Symbol('scale');

export class RenderEngine implements RenderEngineConstructor, Engines {
  ctx!: CanvasRenderingContext2D;
  limits!: MinMax;
  app!: Info;
  getPixelPosition!: (timestamp: number) => number;
  heatMap: Record<λFile['name'], Heatmap> & { [scale]: number } = {
    [scale]: 1
  };
  statusMap: Record<λFile['name'], StatusMap> & { [scale]: number } = {
    [scale]: 1
  };
  private static instance: RenderEngine | null = null;

  constructor({ ctx, limits, app, getPixelPosition }: RenderEngineConstructor) {
    if (RenderEngine.instance) {
      RenderEngine.instance.ctx = ctx;
      RenderEngine.instance.limits = limits;
      RenderEngine.instance.app = app;
      RenderEngine.instance.getPixelPosition = getPixelPosition;
      RenderEngine.instance.heatMap[scale] = app.timeline.scale;
      RenderEngine.instance.statusMap[scale] = app.timeline.scale;
      return RenderEngine.instance;
    }

    this.ctx = ctx;
    this.limits = limits;
    this.app = app;
    this.getPixelPosition = getPixelPosition;
    this.heatMap[scale] = app.timeline.scale;
    this.statusMap[scale] = app.timeline.scale;
    RenderEngine.instance = this;
  }

  default(file: λFile, y: number) {
    let λpos = 0;

    File.events(this.app, file).forEach((event: λEvent) => {
      if (throwableByTimestamp(event.timestamp + file.offset, this.limits)) return;

      const pos = this.getPixelPosition(event.timestamp + file.offset);

      if (λpos === pos) return;

      λpos = pos;

      this.ctx.fillStyle = file.color;
      this.ctx.fillRect(pos, y, 1, 48 - 1);
    });
  }
  
  async heatmap(file: λFile, y: number) {
    const heat = this.heatMap[scale] === this.app.timeline.scale && this.heatMap[file.name] ? this.heatMap[file.name] : await this.getHeatmap(file);

    [...heat].forEach(hit => {
      const [_, { color, height, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp + file.offset, this.limits)) return;

      this.ctx.fillStyle = color;
      this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47, 1, -height);
    });
  };
  
  graph = (file: λFile, y: number) => {
    
  };

  async apache(file: λFile, y: number) {
    const heat = this.statusMap[scale] === this.app.timeline.scale && this.statusMap[file.name] ? this.statusMap[file.name] : await this.getStatusMap(file);

    [...heat].forEach(hit => {
      const [_, { codes, colors, heights, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp + file.offset, this.limits)) return;

      codes.map((code, i) => {
        this.ctx.fillStyle = colors[i];
        this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47 - heights[i], 1, 1);
      })
    });
  };

  private getHeatmap = (file: λFile): Promise<Heatmap> => {
    return new Promise((resolve) => {
      const heat: Heatmap = new Map();
  
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
  
      this.heatMap = ({ ...this.heatMap, [file.name]: heat, [scale]: this.app.timeline.scale });
  
      resolve(heat);
    });
  };

  private getStatusMap = (file: λFile): Promise<StatusMap> => {
    return new Promise((resolve) => {
      const heat: StatusMap = new Map();
  
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
  
      this.statusMap = ({ ...this.statusMap, [file.name]: heat, [scale]: this.app.timeline.scale });
  
      resolve(heat);
    });
  }
}