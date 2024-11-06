import { λFile } from "@/dto/File.dto";
import { MinMax } from "@/dto/QueryMaxMin.dto";
import { Event, File, μ } from "./Info";
import { λApp } from "@/dto";
import { Color, stringToHexColor, throwableByTimestamp, λColor } from "@/ui/utils";
import { Engine } from "@/dto/Engine.dto";
import { format } from "date-fns";
import { XY, XYBase } from "@/dto/XY.dto";
import { λLink } from "@/dto/Link.dto";
import { λEvent } from "@/dto/ChunkEvent.dto";

const Scale = Symbol('Scale');
const Amount = Symbol('Amount');
const Max = Symbol('Max');

interface RenderEngineConstructor {
  ctx: CanvasRenderingContext2D,
  limits: MinMax,
  app: λApp,
  scrollY: number;
  getPixelPosition: (timestamp: number) => number,
}

export type HeightMap = Map<number, number> & Amount & Max;

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
  [Scale]: number
}
export interface Amount {
  [Amount]: number;
}
export interface Max {
  [Max]: number;
}

export type DefaultMap = Map<number, Default> & Scale;

export interface Graph {
  timestamp: number,
  height: number
}

export type GraphMap = Map<number, Graph> & Scale;

type Engines = {
  [key in Engine]: (file: λFile, y: number) => void;
};

export interface Dot {
  x: number;
  y: number;
  color: string;
}

export class RenderEngine implements RenderEngineConstructor, Engines {
  ctx!: CanvasRenderingContext2D;
  limits!: MinMax;
  app!: λApp;
  getPixelPosition!: (timestamp: number) => number;
  scrollY!: number;
  heightMap: Record<λFile['uuid'], HeightMap> = {};
  statusMap: Record<λFile['uuid'], StatusMap> = {};
  defaultMap: Record<λFile['uuid'], DefaultMap> = {};
  graphMap: Record<λFile['uuid'], GraphMap> = {};
  segmentSize: number = 500;
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
      ? this.defaultMap[file.uuid]
      : this.getDefault(file);

    const max = Math.max(...[...heat.values()].map(v => v.code));

    [...heat].forEach(hit => {
      // eslint-disable-next-line
      const [_, { code, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp, this.limits, 0, this.app)) return;


      this.ctx.fillStyle = λColor.gradient(file.color, code, {
        min: file.event.min || 0,
        max: file.event.max || max,
      });
      this.ctx.fillRect(this.getPixelPosition(timestamp), y, 1, 47);
    });
  }
  
  async height(file: λFile, y: number) {
    const heat = this.useCache(this.heightMap, file.uuid)
      ? this.heightMap[file.uuid]
      : this.getHeightmap(file);

    [...heat].forEach((hit) => {
      // eslint-disable-next-line
      const [ segment, amount ] = hit;
      const timestamp = segment * this.segmentSize;

      if (throwableByTimestamp(timestamp, this.limits, file.offset, this.app)) return;

      this.ctx.fillStyle = λColor.gradient(file.color, amount, {
        min: 0,
        max: heat[Max],
      });
      this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47, 1, -(1 + (47 - 1) * (amount / heat[Max])));
    });
  };
  
  graph(file: λFile, _y: number) {
    const heat = this.useCache(this.heightMap, file.uuid)
      ? this.heightMap[file.uuid]
      : this.getHeightmap(file);
  
    const heats = [...heat];
  
    heats.forEach((hit, i) => {});
  }
  

  apache(file: λFile, y: number) {
    const heat = this.process(this.statusMap, file)
      ? this.statusMap[file.uuid]
      : this.getStatusMap(file);

    [...heat].forEach(hit => {
      // eslint-disable-next-line
      const [_, { codes, heights, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp, this.limits, file.offset, this.app)) return;

      codes.forEach((code, i) => {
        this.ctx.fillStyle = λColor.gradient(file.color, code, {
          min: file.event.min || 0,
          max: file.event.max || 599,
        });
        this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47 - heights[i], 1, 1);
      })
    });
  };

  /**
   * Рисует линию разграничения снизу исходя из названия контекста
   */
  public lines = (file: λFile) => {
    const color = stringToHexColor(File.context(this.app, file).name);
    const y = File.getHeight(this.app, file, this.scrollY);

    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, y + 23, window.innerWidth, 1);

    this.fill(color, y);
  }

  /**
   * Рисует линию как из метода `this.lines` но только вверху
   */
  public primary = (file: λFile) => {
    const y = File.getHeight(this.app, file, this.scrollY);

    this.ctx.fillStyle = stringToHexColor(File.context(this.app, file).name);
    this.ctx.fillRect(0, y - 25, window.innerWidth, 1);
  }

  /**
   * 
   * @param color `Color` - цвет заливки
   * @param y `number` - позиция по середине `λFile`
   */
  public fill = (color: Color, y: number) => {
    this.ctx.fillStyle = color + 12;
    this.ctx.fillRect(0, y - 24, window.innerWidth, 48);
  }


  public links = () => {
    this.app.target.links.forEach(link => {
      if (link.events.some(e => !File.uuid(this.app, e._uuid).selected)) return;

      const { dots, center } = this.calcDots(link)

      this.connection(dots);
      this.connection(dots, center);
      dots.forEach(dot => this.dot(dot));
    });
  }

  public connection = (dots: Dot[], center?: XY) => {
    if (!dots.length) return;

    this.ctx.beginPath();
    this.ctx.moveTo(dots[0].x, dots[0].y);
    this.ctx.lineWidth = 2;
  
    dots.forEach(({ x, y, color }) => {
      this.ctx.strokeStyle = color;
      this.ctx.lineTo(x, y);
      if (center) {
        this.ctx.strokeStyle = color + 48;
        this.ctx.lineTo(center.x / dots.length, center.y / dots.length);
      }
    });
  
    this.ctx.stroke();
  };

  public dot = ({ x, y, color }: Dot) => {
    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.beginPath();
    this.ctx.roundRect(x - 4, y - 4, 8, 8, [999]);
    this.ctx.fill();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 3, y - 3, 6, 6, [999]);
    this.ctx.fill();
  }

  public calcDots = (link: λLink): {
    dots: Dot[],
    center: XY
  } => {
    const center = XYBase(0);
    const dots: Dot[] = link.events.map(e => {
      const index = File.selected(this.app).findIndex(f => f.uuid === e._uuid);

      const x = this.getPixelPosition(e.timestamp + (File.selected(this.app)[index]?.offset || 0));
      const y = index * 48 + 20 - this.scrollY;

      center.x += x;
      center.y += y;

      return { x, y, color: link.data.color || stringToHexColor(link.events.map(e => e._id).toString()) };
    });

    return { dots, center }
  }

  public locals = (file: λFile) => {
    const loading = ' Loading... ';
    const y = File.getHeight(this.app, file, this.scrollY);

    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillRect(this.getPixelPosition(file.timestamp.max + file.offset) + 2, y - 24, 2, 48 - 1);
    this.ctx.fillRect(this.getPixelPosition(file.timestamp.min + file.offset) - 2, y - 24, 2, 48 - 1);
    
    this.ctx.font = `10px Arial`;
    this.ctx.fillStyle = '#a1a1a1';
    this.ctx.fillText(format(file.timestamp.min, 'dd.MM.yyyy'), this.getPixelPosition(file.timestamp.min) - 64, y + 4);
    this.ctx.fillText(format(file.timestamp.max, 'dd.MM.yyyy'), this.getPixelPosition(file.timestamp.max) + 12, y + 4);

    this.ctx.font = `10px Arial`;
    this.ctx.fillStyle = '#0372ef';
    const events = Event.get(this.app, file.uuid).length.toString()
    this.ctx.fillText(events, this.getPixelPosition(file.timestamp.max) + 12, y + 14);
    this.ctx.fillText(events, this.getPixelPosition(file.timestamp.min) - 64, y + 14);
    this.ctx.fillStyle = '#e8e8e8';
    const isLoading = !this.app.timeline.loaded.includes(file.uuid);
    this.ctx.fillText(file.doc_count.toString() + (isLoading ? loading : ''), this.getPixelPosition(file.timestamp.max) + 12, y - 6);
    this.ctx.fillText(file.doc_count.toString() + (isLoading ? loading : ''), this.getPixelPosition(file.timestamp.min) - 64, y - 6);
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

  public debug = (pos: XY, logs: string[]) => {
    this.ctx.font = `12px Arial`;
    this.ctx.fillStyle = '#e8e8e8';
    logs.forEach((log, i) => {
      this.ctx.fillText(log, pos.x, pos.y - 12 * i);
    })
  }

  public target = () => {
    if (!this.app.timeline.target) return;

    const file = File.uuid(this.app, this.app.timeline.target._uuid);

    if (!file) return;

    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.fillRect(0, File.selected(this.app).findIndex(f => f.uuid === file.uuid) * 48 + 23 - this.scrollY, window.innerWidth, 1)
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

    heat[Scale] = this.app.timeline.scale;
    this.defaultMap = {
      ...this.defaultMap,
      [file.uuid]: heat
    };

    return heat;
  }

  private getGraphMap = (file: λFile): GraphMap => {
    const heat: GraphMap = new Map() as GraphMap;

    File.events(this.app, file).forEach((event, i) => {
      const timestamp = event.timestamp + file.offset;
      const λpos = this.getPixelPosition(timestamp);
      const λposGroup = Math.floor(λpos / 8) * 8;

      const obj: Graph = heat.get(λposGroup) || {
        height: 0,
        timestamp
      };

      obj.height++;

      heat.set(λposGroup, obj);
    });

    heat[Scale] = this.app.timeline.scale;
    this.graphMap = {
      ...this.graphMap,
      [file.uuid]: heat
    };
  
    return heat;
  }

  private getHeightmap = (file: λFile): HeightMap => {
    const heat = new Map() as HeightMap;

    const processed = this.segment(File.events(this.app, file).slice(-2, -1).pop()?.timestamp || 0);

    File.events(this.app, file).forEach(event => {
      const segment = this.segment(event.timestamp);
      if (processed === segment) {
        const cache = this.heightMap?.[file.uuid]?.get(processed);
        if (cache) {
          heat.set(processed, cache);
        }
      }
      heat.set(segment, (heat.get(segment) || 0) + 1);
    });

    heat[Amount] = Event.get(this.app, file.uuid).length;
    heat[Max] = Math.max(...heat.values());
    this.heightMap[file.uuid] = heat;
  
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

    heat[Scale] = this.app.timeline.scale;
    this.statusMap = {
      ...this.statusMap,
      [file.uuid]: heat,
    };
  
    return heat;
  }

  private process = (map: Record<string, StatusMap | DefaultMap | GraphMap>, file: λFile): boolean => Boolean(map[file.uuid]?.[Scale] === this.app.timeline.scale && file.doc_count === File.events(this.app, file).length);

  private useCache = (map: Record<string, HeightMap>, uuid: μ.File): boolean => map[uuid]?.[Amount] === Event.get(this.app, uuid).length

  private segment = (timestamp: number) => Math.floor((timestamp - (timestamp % this.segmentSize)) / this.segmentSize);
}
