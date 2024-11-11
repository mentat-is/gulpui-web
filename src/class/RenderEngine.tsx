import { λFile } from "@/dto/File.dto";
import { MinMax } from "@/dto/QueryMaxMin.dto";
import { Event, File, Info, λ, μ } from "./Info";
import { λApp } from "@/dto";
import { Color, stringToHexColor, throwableByTimestamp, λColor } from "@/ui/utils";
import { Engine } from "@/dto/Engine.dto";
import { format } from "date-fns";
import { XY, XYBase } from "@/dto/XY.dto";
import { λLink } from "@/dto/Link.dto";

interface RenderEngineConstructor {
  ctx: CanvasRenderingContext2D,
  limits: MinMax,
  info: Info,
  scrollY: number;
  getPixelPosition: (timestamp: number) => number,
}

export type HeightMap = Map<λ.Timestamp, λ.Height> & Amount & Max;

export interface Status {
  codes: number[],
  timestamp: number,
  heights: number[]
}

export type StatusMap = Map<number, Status> & Scale;

export type GraphMap = HeightMap & Scale & Rendered;

export interface Default {
  timestamp: number,
  code: number
}

const Scale = Symbol('Scale');
// eslint-disable-next-line
export interface Scale {
  [Scale]: number
}

const Amount = Symbol('Amount');
// eslint-disable-next-line
export interface Amount {
  [Amount]: λ.Height;
}

const Max = Symbol('Max');
// eslint-disable-next-line
export interface Max {
  [Max]: λ.Height;
}

const Start = Symbol('Start');
const End = Symbol('End');
export interface Rendered {
  [Start]: λ.Timestamp;
  [End]: λ.Timestamp;
}

export type DefaultMap = Map<number, Default> & Scale & Max;

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
  info!: Info;
  getPixelPosition!: (timestamp: number) => number;
  scrollY!: number;
  heightMap: Record<λFile['uuid'], HeightMap> = {};
  statusMap: Record<λFile['uuid'], StatusMap> = {};
  defaultMap: Record<λFile['uuid'], DefaultMap> = {};
  graphMap: Record<λFile['uuid'], GraphMap> = {};
  segmentSize: number = 500;
  private static instance: RenderEngine | null = null;

  constructor({ ctx, limits, info, getPixelPosition, scrollY }: RenderEngineConstructor) {
    if (RenderEngine.instance) {
      RenderEngine.instance.ctx = ctx;
      RenderEngine.instance.limits = limits;
      RenderEngine.instance.info = info;
      RenderEngine.instance.scrollY = scrollY;
      RenderEngine.instance.getPixelPosition = getPixelPosition;
      return RenderEngine.instance;
    }

    this.ctx = ctx;
    this.limits = limits;
    this.info = info;
    this.getPixelPosition = getPixelPosition;
    RenderEngine.instance = this;
  }

  default(file: λFile, y: number) {
    const heat = this.process(this.defaultMap, file)
      ? this.defaultMap[file.uuid]
      : this.getDefault(file);

    Array.from(heat.values()).forEach(hit => {
      const { code, timestamp } = hit;
      
      if (throwableByTimestamp(timestamp + file.offset, this.limits, this.info.app)) return;

      this.ctx.fillStyle = λColor.gradient(file.color, code, {
        min: file.event.min || 0,
        max: heat[Max],
      });
      this.ctx.fillRect(this.getPixelPosition(timestamp), y, 1, 47);
    });
  }
  
  height(file: λFile, y: number) {
    const heat = this.useCache(this.heightMap, file.uuid)
      ? this.heightMap[file.uuid]
      : this.getHeightmap(file);

      for (const [timestamp, amount] of heat) {
        if (throwableByTimestamp(timestamp + file.offset, this.limits, this.info.app)) continue;
      
        this.ctx.fillStyle = λColor.gradient(file.color, amount, {
          min: 0,
          max: heat[Max],
        });
        
        this.ctx.fillRect(
          this.getPixelPosition(timestamp), 
          y + 47, 
          1, 
          -(1 + (47 - 1) * (amount / heat[Max]))
        );
      }
  };
  
  graph(file: λFile, _y: number) {
    const heat = this.useCache(this.heightMap, file.uuid)
      ? this.heightMap[file.uuid]
      : this.getHeightmap(file); 
  
    const graphs = (
      this.graphMap[file.uuid] &&
      this.graphMap[file.uuid][Scale] === this.info.app.timeline.scale && 
      this.graphMap[file.uuid][Start] > this.limits.max && 
      this.graphMap[file.uuid][End] > this.limits.min
    ) ? this.graphMap[file.uuid] : this.getGraphMap(heat, file);

    const max = graphs[Max];
  
    let last: Dot | null = null;

    for (const [timestamp, height] of graphs) {
      const x = this.getPixelPosition(timestamp);
      const y = _y + 47 - Math.floor((height / max) * 47);
      const color = λColor.gradient(file.color, height, { min: 0, max });

      this.ctx.font = `8px Arial`;
      this.ctx.fillStyle = color;
      this.ctx.fillText(height.toString(), x - 3.5, y - 8);

      const dot = { x, y, color };

      if (last) {
        this.connection([dot, last]);
      }

      last = dot;
      this.dot(dot);
    };
  }

  getGraphMap(map: HeightMap, file: λFile) {
    const result = new Map() as unknown as GraphMap;

    for (const [timestamp, height] of map) {
      if (throwableByTimestamp(timestamp, {
        min: this.limits.min - 3000,
        max: this.limits.max + 3000,
      }, this.info.app)) continue;

      const x = this.getPixelPosition(timestamp);
      const [lastTimestamp, lastHeight] = Array.from(result).pop() || [];

      if (lastTimestamp && lastHeight && Math.abs(this.getPixelPosition(lastTimestamp) - x) < 8) {
        const newLastResult = lastHeight + height;
        result.set(lastTimestamp, newLastResult as λ.Height);
      } else {
        result.set(timestamp, height);
      }
    }

    const max = Math.max(...Array.from(result).map(v => v[1]));

    this.graphMap[file.uuid] = result;
    this.graphMap[file.uuid][Scale] = this.info.app.timeline.scale;
    this.graphMap[file.uuid][Max] = max as λ.Height;
    this.graphMap[file.uuid][Start] = Array.from(result)[0]?.[0] || 0 as λ.Timestamp;
    this.graphMap[file.uuid][End] = Array.from(result).pop()?.[0] || 0 as λ.Timestamp;

    return result;
  }

  apache(file: λFile, y: number) {
    const heat = this.process(this.statusMap, file)
      ? this.statusMap[file.uuid]
      : this.getStatusMap(file);

    [...heat].forEach(hit => {
      // eslint-disable-next-line
      const [_, { codes, heights, timestamp }] = hit;
      
      if (throwableByTimestamp(timestamp + file.offset, this.limits, this.info.app)) return;

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
    const color = stringToHexColor(File.context(this.info.app, file).name);
    const y = File.getHeight(this.info.app, file, this.scrollY);

    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, y + 23, window.innerWidth, 1);

    this.fill(color, y);
  }

  /**
   * Рисует линию как из метода `this.lines` но только вверху
   */
  public primary = (file: λFile) => {
    const y = File.getHeight(this.info.app, file, this.scrollY);

    this.ctx.fillStyle = stringToHexColor(File.context(this.info.app, file).name);
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
    this.info.app.target.links.forEach(link => {
      if (link.events.some(e => !File.uuid(this.info.app, e._uuid).selected)) return;

      const { dots, center } = this.calcDots(link)

      this.connection(dots);
      this.connection(dots, center);
      dots.forEach(dot => this.dot(dot));
    });
  }

  public connection = (dots: Dot[], center?: XY) => {
    if (dots.length < 2) return;
  
    this.ctx.lineWidth = 2;
  
    for (let i = 1; i < dots.length; i++) {
      const start = dots[i - 1];
      const end = dots[i];
  
      const gradient = this.ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, start.color);
      gradient.addColorStop(1, end.color);
  
      this.ctx.strokeStyle = gradient;
  
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
  
      if (center) {
        const centerGradient = this.ctx.createLinearGradient(end.x, end.y, center.x, center.y);
        centerGradient.addColorStop(0, end.color + '48');
        centerGradient.addColorStop(1, end.color);
  
        this.ctx.strokeStyle = centerGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(end.x, end.y);
        this.ctx.lineTo(center.x, center.y);
        this.ctx.stroke();
      }
    }
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
      const index = File.selected(this.info.app).findIndex(f => f.uuid === e._uuid);

      const x = this.getPixelPosition(e.timestamp + (File.selected(this.info.app)[index]?.offset || 0));
      const y = index * 48 + 20 - this.scrollY;
      const color = (link.data.color || stringToHexColor(link.events.map(e => e._id).toString()))

      center.x += x;
      center.y += y;

      return { x, y, color: color.endsWith('48') ? color.slice(-2) : color };
    });

    return { dots, center }
  }

  public locals = (file: λFile) => {
    const y = File.getHeight(this.info.app, file, this.scrollY);

    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillRect(this.getPixelPosition(file.timestamp.max + file.offset) + 2, y - 24, 2, 48 - 1);
    this.ctx.fillRect(this.getPixelPosition(file.timestamp.min + file.offset) - 2, y - 24, 2, 48 - 1);
    
    this.ctx.font = `10px Arial`;
    this.ctx.fillStyle = '#a1a1a1';
    this.ctx.fillText(format(file.timestamp.min, 'dd.MM.yyyy'), this.getPixelPosition(file.timestamp.min) - 64, y + 4);
    this.ctx.fillText(format(file.timestamp.max, 'dd.MM.yyyy'), this.getPixelPosition(file.timestamp.max) + 12, y + 4);

    this.ctx.font = `10px Arial`;
    this.ctx.fillStyle = '#0372ef';
    const events = Event.get(this.info.app, file.uuid).length.toString()
    this.ctx.fillText(events, this.getPixelPosition(file.timestamp.max) + 12, y + 14);
    this.ctx.fillText(events, this.getPixelPosition(file.timestamp.min) - 64, y + 14);
    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillText(file.doc_count.toString(), this.getPixelPosition(file.timestamp.max) + 12, y - 6);
    this.ctx.fillText(file.doc_count.toString(), this.getPixelPosition(file.timestamp.min) - 64, y - 6);
  }

  public draw_info = (file: λFile) => {
    const y = File.getHeight(this.info.app, file, this.scrollY) + 4;

    this.ctx.font = `12px Arial`;
    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillText(file.name, 10, y);
    
    this.ctx.font = `10px Arial`;
    this.ctx.fillStyle = '#a1a1a1';
    this.ctx.fillText(`${file.doc_count.toString()} | ${File.context(this.info.app, file).name}`, 10, y - 14);
    
    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillText(File.events(this.info.app, file).length.toString(), 10, y + 14);
  }

  public debug = (pos: XY, logs: string[]) => {
    this.ctx.font = `12px Arial`;
    this.ctx.fillStyle = '#e8e8e8';
    logs.forEach((log, i) => {
      this.ctx.fillText(log, pos.x, pos.y - 12 * i);
    })
  }

  public target = () => {
    if (!this.info.app.timeline.target) return;

    const file = File.uuid(this.info.app, this.info.app.timeline.target._uuid);

    if (!file) return;

    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.fillRect(0, File.selected(this.info.app).findIndex(f => f.uuid === file.uuid) * 48 + 23 - this.scrollY, window.innerWidth, 1)
    this.ctx.fillRect(this.getPixelPosition(this.info.app.timeline.target.timestamp + file.offset), 0, 1, window.innerWidth)
  }

  private getDefault = (file: λFile): DefaultMap => {
    const heat: DefaultMap = new Map() as DefaultMap;

    File.events(this.info.app, file).forEach(event => {
      const timestamp = event.timestamp + file.offset;
      const λpos = this.getPixelPosition(timestamp);

      heat.set(λpos, {
        code: parseInt(event.event.code) || 0,
        timestamp
      });
    });

    heat[Scale] = this.info.app.timeline.scale;
    heat[Max] = Math.max(...Array.from(heat.values()).map(h => h.code)) as λ.Height;
    this.defaultMap = {
      ...this.defaultMap,
      [file.uuid]: heat
    };

    return heat;
  }

  private getHeightmap = (file: λFile): HeightMap => {
    const heat = new Map() as HeightMap;

    File.events(this.info.app, file).forEach(event => heat.set(event.timestamp as λ.Timestamp, (((heat.get(event.timestamp as λ.Timestamp) || 0) as number) + 1) as λ.Height));

    heat[Amount] = Event.get(this.info.app, file.uuid).length as λ.Height;
    let maxHeight = -Infinity;
    for (const value of heat.values()) {
      if (value > maxHeight) {
        maxHeight = value;
      }
    }
    heat[Max] = maxHeight as λ.Height;
    this.heightMap[file.uuid] = heat;
  
    return heat;
  };

  private getStatusMap = (file: λFile): StatusMap => {
    const heat: StatusMap = new Map() as StatusMap;

    File.events(this.info.app, file).forEach(event => {
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

    heat[Scale] = this.info.app.timeline.scale;
    this.statusMap = {
      ...this.statusMap,
      [file.uuid]: heat,
    };
  
    return heat;
  }

  private process = (map: Record<string, StatusMap | DefaultMap | GraphMap>, file: λFile): boolean => Boolean(map[file.uuid]?.[Scale] === this.info.app.timeline.scale);

  private useCache = (map: Record<string, HeightMap>, uuid: μ.File): boolean => map[uuid]?.[Amount] === Event.get(this.info.app, uuid).length

  // private segment = (timestamp: number) => Math.floor((timestamp - (timestamp % this.segmentSize)) / this.segmentSize);

  private wait = (file: λFile, y: number) => {

  }
}
