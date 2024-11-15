import { MinMax } from "@/dto/QueryMaxMin.dto";
import { getDateFormat } from "@/ui/utils";
import { addMilliseconds, differenceInMilliseconds, formatDate } from "date-fns";

interface RulerDrawerConstructor {
  ctx: CanvasRenderingContext2D;
  selected: MinMax | null;
  width: number;
  scale: number;
  getPixelPosition: (timestamp: number) => number;
  scrollX: number;
}

interface RulerSectionProps {
  timestamp: number;
  position: number;
  format: string;
  step: number;
  unit: string;
  value: number;
  even: boolean;
}

export class RulerDrawer implements RulerDrawerConstructor {
  ctx!: CanvasRenderingContext2D;
  selected!: MinMax | null;
  width!: number;
  scale!: number;
  getPixelPosition!: (timestamp: number) => number;
  scrollX!: number;
  cache: RulerSectionProps[] = [];
  private static instance: RulerDrawer;

  constructor({ ctx, getPixelPosition, scrollX, scale, selected, width }: RulerDrawerConstructor) {
    if (RulerDrawer.instance) {
      RulerDrawer.instance.ctx = ctx;
      RulerDrawer.instance.scrollX = scrollX;
      RulerDrawer.instance.scale = scale;
      RulerDrawer.instance.selected = selected;
      RulerDrawer.instance.width = width;
      RulerDrawer.instance.getPixelPosition = getPixelPosition;
      return RulerDrawer.instance;
    }

    this.ctx = ctx;
    this.scrollX = scrollX;
    this.scale = scale;
    this.selected = selected;
    this.width = width;
    this.getPixelPosition = getPixelPosition;
    RulerDrawer.instance = this;
    return RulerDrawer.instance;
  }

  draw() {
    this.cache = [];
    if (!this.selected)
      return;
  
    const { max, min } = this.selected;
  
    const total = differenceInMilliseconds(max, min);
    const width = (this.width / this.scale) || 0;
  
    const start = addMilliseconds(min, (this.scrollX / this.width) * total).valueOf();
    const end = addMilliseconds(min, ((this.scrollX + width) / this.width) * total).valueOf();
  
    const [ step, unit, value ] = this.step(end - start);
  
    const roundedStart = Math.floor(start / step) * step;
    const roundedEnd = Math.ceil(end / step) * step;
  
    const format = getDateFormat(step);
  
    let timestamp = roundedStart;
    let even = Math.floor(new Date(timestamp).getTime() / step) % 2 === 0;
  
    while (timestamp <= roundedEnd) {
      const position = this.getPixelPosition(timestamp);
      this.cache.push({ timestamp, position, format, step, unit, value, even })
      this.wall({ even, position });
      timestamp += step;
      even = !even;
    }
  }  

  step(totalMilliseconds: number): [number, string, number] {
    let optimalInterval = 0;
    let _unit = 'nanoseconds';
    let _value = 0;
    let bestNumSections = Infinity;

    const intervals = [
      { unit: 'nanoseconds', values: [1, 10, 100, 500] },
      { unit: 'milliseconds', values: [1, 10, 100, 250, 500] },
      { unit: 'seconds', values: [1, 2, 5, 10, 15, 30] },
      { unit: 'minutes', values: [1, 2, 5, 10, 15, 30] },
      { unit: 'hours', values: [1, 3, 6, 12] },
      { unit: 'days', values: [1, 2, 5, 10] },
      { unit: 'months', values: [1, 3, 6] },
      { unit: 'years', values: [1, 2, 3, 5, 10, 25, 50, 100] }
    ];
    
    intervals.forEach(({ unit, values }) => {
      values.forEach(value => {
        const intervalMs = value * {
          nanoseconds: 0.001,
          milliseconds: 1,
          seconds: 1000,
          minutes: 60 * 1000,
          hours: 60 * 60 * 1000,
          days: 24 * 60 * 60 * 1000,
          months: 30 * 24 * 60 * 60 * 1000,
          years: 365 * 24 * 60 * 60 * 1000,
        }[unit]!;
        
        const numSections = totalMilliseconds / intervalMs;

        if (numSections >= 4 && numSections <= 40 && numSections < bestNumSections) {
          bestNumSections = numSections;
          _unit = unit;
          _value = value;
          optimalInterval = intervalMs;
        }
      });
    });

    return [optimalInterval, _unit, _value];
  }

  separator() {
    this.ctx.beginPath();
    this.ctx.moveTo(0, 25);
    this.ctx.lineTo(this.ctx.canvas.width, 25);
    this.ctx.strokeStyle = "#ffffff25";
    this.ctx.stroke();
  }

  private wall(props: Pick<RulerSectionProps, 'even' | 'position'>) {
    this.ctx.fillStyle = props.even ? '#161616' : '#202020'
    this.ctx.fillRect(props.position, 25, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.beginPath();
    this.ctx.moveTo(props.position, 0);
    this.ctx.lineTo(props.position, this.ctx.canvas.height);
    this.ctx.strokeStyle = "#ffffff12";
    this.ctx.stroke();
  }

  sections() {
    this.cache.map(c => this.section(c));
    this.separator();
  }

  section(props: RulerSectionProps) {
    this.ctx.fillStyle = props.even ? '#121212' : '#161616'
    this.ctx.fillRect(props.position, 0, this.ctx.canvas.width, 25);
    // @ts-ignore:next-line
    this.ctx.textRendering = 'optimizeLegibility';
    const timeUnit = props.format || 'MMM yyyy';
    const label = formatDate(props.timestamp, timeUnit);
    this.ctx.font = "10px Arial";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, props.position, 14);
    this.ctx.fillStyle = "#e8e8e880";
    this.ctx.fillText(`${props.value} ${props.unit}`, this.getPixelPosition(props.timestamp + props.step / 2), 14);
  }
}