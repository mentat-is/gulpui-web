import { λFile } from "@/dto/File.dto";
import { MinMax } from "@/dto/QueryMaxMin.dto";
import { File } from "./Info";
import { Info } from "@/dto";
import { getColorByCode, stringToHexColor, throwableByTimestamp, useGradient } from "@/ui/utils";
import { Engine } from "@/dto/Engine.dto";
import { HALFHEIGHT, HEIGHT } from "@/app/gulp/components/body/TimelineCanvas";
import { format } from "date-fns";

const scale = Symbol('scale');

interface RenderEngineConstructor {
  ctx: CanvasRenderingContext2D,
  limits: MinMax,
  app: Info,
  scrollY: number;
  getPixelPosition: (timestamp: number) => number
}

export interface Heat {
  amount: number,
  height: number,
  timestamp: number
}

export type HeightMap = Map<number, Heat> & Scale;

export interface Status {
  codes: number[],
  timestamp: number,
  heights: number[]
}

export type StatusMap = Map<number, Status> & Scale;

export interface Default {
  timestamp: number,
  code: number
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
  scrollY!: number;
  heightMap: Record<λFile['name'], HeightMap> = {};
  statusMap: Record<λFile['name'], StatusMap> = {};
  defaultMap: Record<λFile['name'], DefaultMap> = {};
  private static instance: RenderEngine | null = null;

  constructor({ ctx, limits, app, getPixelPosition, scrollY }: RenderEngineConstructor) {
    if (RenderEngine.instance) {
      RenderEngine.instance.ctx = ctx;
      RenderEngine.instance.limits = limits;
      RenderEngine.instance.app = app;
      RenderEngine.instance.scrollY = scrollY;
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

    const max = Math.max(...[...heat.values()].map(v => v.code));

    [...heat].forEach(hit => {
      const [_, { code, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp, this.limits)) return;

      this.ctx.fillStyle = useGradient(file.color, code, {
        min: file.event.min || 0,
        max: file.event.max || max,
      });
      this.ctx.fillRect(this.getPixelPosition(timestamp), y, 1, 47);
    });
  }
  
  async height(file: λFile, y: number) {
    const heat = this.process(this.heightMap, file)
      ? this.heightMap[file.name]
      : this.getHeightmap(file);

    const max = Math.max(...[...heat.values()].map(v => v.height));

    [...heat].forEach((hit) => {
      const [_, { height, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp, this.limits)) return;

      this.ctx.fillStyle = useGradient(file.color, height, {
        min: 0,
        max,
      });
      this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47, 1, -height);
    });
  };
  
  graph = (file: λFile, y: number) => this.default(file, y);

  async apache(file: λFile, y: number) {
    const heat = this.process(this.statusMap, file)
      ? this.statusMap[file.name]
      : this.getStatusMap(file);

    [...heat].forEach(hit => {
      const [_, { codes, heights, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp, this.limits)) return;

      codes.map((code, i) => {
        this.ctx.fillStyle = useGradient(file.color, code, {
          min: file.event.min || 0,
          max: file.event.max || 599,
        });
        this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47 - heights[i], 1, 1);
      })
    });
  };

  public lines = (file: λFile) => {
    const y = File.getHeight(this.app, file, this.scrollY) - HEIGHT / 2;

    this.ctx.fillStyle = stringToHexColor(File.context(this.app, file).name) + HEIGHT;
    this.ctx.fillRect(0, y + HEIGHT - 1, window.innerWidth, 1);
  }

  public links = () => {
    this.app.target.links.forEach(l => {
      const dots: ({ x: number; y: number; color: string; })[] = l.events.map(e => {
        const i = File.selected(this.app).findIndex(f => f.uuid === e._uuid);

        const file = File.selected(this.app)[i];

        return {
          x: this.getPixelPosition(e.timestamp + (file?.offset || 0)),
          y: i * 48 + 20 - this.scrollY,
          color: l.data.color || stringToHexColor(l.events.map(e => e._id).toString())
        }
      });

      if (dots.length === 1) return;

      if (dots.length > 1) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = dots[0].color;
        this.ctx.lineWidth = 1;

        this.ctx.moveTo(dots[0].x, dots[0].y + 4);

        dots.slice(1).forEach(({ x, y }) => {
          this.ctx.lineTo(x + 4, y + 4);
        });
    
        this.ctx.stroke();
      }
      
      dots.forEach(({ color, x, y }) => {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, 8, 8, [999]);
        this.ctx.fill();
      })
    });
  }

  public locals = (file: λFile) => {
    const y = File.getHeight(this.app, file, this.scrollY);

    this.ctx.fillStyle = file.color;
    this.ctx.fillRect(this.getPixelPosition(file.timestamp.max + file.offset), y - HALFHEIGHT, 1, HEIGHT - 1);
    this.ctx.fillRect(this.getPixelPosition(file.timestamp.min + file.offset), y - HALFHEIGHT, 1, HEIGHT - 1);
    
    this.ctx.font = `10px Arial`;
    this.ctx.fillStyle = '#a1a1a1' + HEIGHT;
    this.ctx.fillText(format(file.timestamp.min, 'dd.MM.yyyy'), this.getPixelPosition(file.timestamp.min) - 64, y + 4);
    this.ctx.fillText(format(file.timestamp.max, 'dd.MM.yyyy'), this.getPixelPosition(file.timestamp.max) + 12, y + 4);
  }

  public info = (file: λFile) => {
    const y = File.getHeight(this.app, file, this.scrollY) + 4;

    this.ctx.font = `12px Arial`;
    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillText(file.name, 10, y);
    
    this.ctx.font = `10px Arial`;
    this.ctx.fillStyle = '#a1a1a1';
    this.ctx.fillText(`${file.doc_count.toString()} | ${File.context(this.app, file).name}`, 10, y - 14);
    
    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillText(File.events(this.app, file).length.toString(), 10, y + 14);
  }

  public target = () => {
    if (!this.app.timeline.target) return;

    const file = File.find(this.app, this.app.timeline.target._uuid);

    if (!file) return;

    this.ctx.fillStyle = 'white'
    this.ctx.fillRect(0, File.selected(this.app).findIndex(f => f.uuid === file.uuid) * HEIGHT + 23 - this.scrollY, window.innerWidth, 1)
    this.ctx.fillRect(this.getPixelPosition(this.app.timeline.target.timestamp + file.offset), 0, 1, window.innerWidth)
  }

  private getDefault = (file: λFile): DefaultMap => {
    const heat: DefaultMap = new Map() as DefaultMap;

    File.events(this.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset;
      const λpos = this.getPixelPosition(timestamp);

      heat.set(λpos, {
        code: parseInt(event.event.code) || 0,
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
        height: 1,
        timestamp
      };

      const amount = obj.amount + 1;

      const max = Math.max(...[...heat.values(), { ...obj, amount }].map(v => v.amount));

      heat.set(λpos, {
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
        heights: [],
        timestamp
      };

      heat.set(λpos, {
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
