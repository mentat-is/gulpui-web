import { λFile } from "@/dto/File.dto";
import { MinMax } from "@/dto/QueryMaxMin.dto";
import { Event, File, Info } from "./Info";
import { Color, stringToHexColor } from "@/ui/utils";
import { format } from "date-fns";
import { XY, XYBase } from "@/dto/XY.dto";
import { λLink } from "@/dto/Link.dto";
import { RulerDrawer } from "./Ruler.drawer";
import { DefaultEngine } from "./Default.engine";
import { Scale, Engine } from "./Engine.dto";
import { HeightEngine } from "./Height.engine";
import { GraphEngine } from "./Graph.engine";

interface RenderEngineConstructor {
  ctx: CanvasRenderingContext2D,
  limits: MinMax,
  info: Info,
  scrollX: number;
  scrollY: number;
  getPixelPosition: (timestamp: number) => number,
}

export interface Status {
  codes: number[],
  timestamp: number,
  heights: number[]
}

export type StatusMap = Map<number, Status> & Scale;

type Engines = {
  [key in Engine.List]: Engine.Interface<any>;
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
  scrollX!: number;
  scrollY!: number;
  segmentSize: number = 500;
  ruler!: RulerDrawer;
  private static instance: RenderEngine | null = null;
  default!: DefaultEngine;
  height!: HeightEngine;
  graph!: GraphEngine;

  constructor({ ctx, limits, info, getPixelPosition, scrollY, scrollX }: RenderEngineConstructor) {
    if (RenderEngine.instance) {
      RenderEngine.instance.ruler = new RulerDrawer({
        ctx,
        getPixelPosition,
        scrollX,
        scale: info.app.timeline.scale,
        selected: info.app.target.bucket.selected,
        width: info.width
      });
      RenderEngine.instance.ctx = ctx;
      RenderEngine.instance.limits = limits;
      RenderEngine.instance.info = info;
      RenderEngine.instance.scrollX = scrollX;
      RenderEngine.instance.scrollY = scrollY;
      RenderEngine.instance.getPixelPosition = getPixelPosition;
      RenderEngine.instance.default = new DefaultEngine(RenderEngine.instance);
      RenderEngine.instance.height = new HeightEngine(RenderEngine.instance);
      RenderEngine.instance.graph = new GraphEngine(RenderEngine.instance);
      return RenderEngine.instance;
    }

    this.ruler = new RulerDrawer({
      ctx,
      getPixelPosition,
      scrollX,
      scale: info.app.timeline.scale,
      selected: info.app.target.bucket.selected,
      width: info.width
    });
    this.ctx = ctx;
    this.limits = limits;
    this.info = info;
    this.getPixelPosition = getPixelPosition;
    
    this.default = new DefaultEngine(this);
    this.height = new HeightEngine(this);
    this.graph = new GraphEngine(this);
    RenderEngine.instance = this;
    return this;
  }

  // apache(file: λFile, y: number) {
  //   const heat = this.scaleCache(this.statusMap, file)
  //     ? this.statusMap[file.uuid]
  //     : this.getStatusMap(file);

  //   [...heat].forEach(hit => {
  //     // eslint-disable-next-line
  //     const [_, { codes, heights, timestamp }] = hit;
      
  //     if (throwableByTimestamp(timestamp + file.offset, this.limits, this.info.app)) return;

  //     codes.forEach((code, i) => {
  //       this.ctx.fillStyle = λColor.gradient(file.color, code, {
  //         min: file.event.min || 0,
  //         max: file.event.max || 599,
  //       });
  //       this.ctx.fillRect(this.getPixelPosition(timestamp), y + 47 - heights[i], 1, 1);
  //     })
  //   });
  // };

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

      const { dots, center } = this.calcDots(link);

      this.connection(dots, center);
      dots.forEach(dot => this.dot(dot));
    });
  }

  public connection = (dots: Dot[], center?: XY) => {
    if (dots.length < 2) return;
  
    for (let i = 0; i < dots.length; i++) {
      this.ctx.lineWidth = 2;
      const start = dots[i];
      const end = dots[i + 1] || dots[0];

      const gradient = this.ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, start.color);
      gradient.addColorStop(1, end.color);
  
      this.ctx.strokeStyle = gradient;
  
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
  
      if (center?.x && center?.y) {
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
    const dots: Dot[] = [];

    link.events.forEach(e => {
      const index = File.selected(this.info.app).findIndex(f => f.uuid === e._uuid);

      const x = this.getPixelPosition(e.timestamp + (File.selected(this.info.app)[index]?.offset || 0));
      const y = (index * 48 + 20 - this.scrollY || 0);
      const color = (link.data.color || stringToHexColor(link.events.map(e => e._id).toString()))

      center.x += x;
      center.y += y;

      dots.push({
        x,
        y,
        color: color.endsWith('48')
          ? color.slice(-2)
          : color });
    });

    center.x = center.x / (dots.length || 1);
    center.y = center.y / (dots.length || 1);

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

  // private getStatusMap = (file: λFile): StatusMap => {
  //   const heat: StatusMap = new Map() as StatusMap;

  //   File.events(this.info.app, file).forEach(event => {
  //     const timestamp = event.timestamp + file.offset;
  //     const λpos = this.getPixelPosition(timestamp);

  //     const code = parseInt(event.event.code);

  //     const obj: Status = heat.get(λpos) || {
  //       codes: [],
  //       heights: [],
  //       timestamp
  //     };

  //     heat.set(λpos, {
  //       codes: [...obj.codes, code],
  //       heights: [...obj.heights, Math.round(((code - file.event.min) / (file.event.max - file.event.min)) * 46 + 1)],
  //       timestamp
  //     });
  //   });

  //   heat[Scale] = this.info.app.timeline.scale;
  //   this.statusMap = {
  //     ...this.statusMap,
  //     [file.uuid]: heat,
  //   };
  
  //   return heat;
  // }

  // private scaleCache = (map: Record<string, StatusMap | GraphMap>, file: λFile): boolean => Boolean(map[file.uuid]?.[Scale] === this.info.app.timeline.scale);

  // private useCache = (map: Record<string, HeightMap>, uuid: μ.File): boolean => map[uuid]?.[Amount] >= Event.get(this.info.app, uuid).length
}
