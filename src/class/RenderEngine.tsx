import { Internal, MinMax, Note, Range } from '@/class/Info'
import { Event, Info, File } from './Info'
import { Color, stringToHexColor } from '@/ui/utils'
import { format } from 'date-fns'
import { RulerDrawer } from './Ruler.drawer'
import { DefaultEngine } from '../engines/Default.engine'
import { Engine, Hardcode } from './Engine.dto'
import { HeightEngine } from '../engines/Height.engine'
import { GraphEngine } from '../engines/Graph.engine'
import { λFile, λLink, λNote } from '@/dto/Dataset'

const NOTE_SIZE = 32;
const NOTE_OFFSET = 32 / 2 * -1;

const mappedColors: Record<string, string> = {
  red: '#d9303629',
  blue: '#0062d129',
  amber: '#ff990a29',
  green: '#398e4a29',
  teal: '#0d8c7d29',
  purple: '#763da929',
  pink: '#df267029'
}

interface RenderEngineConstructor {
  ctx: CanvasRenderingContext2D
  limits: MinMax
  info: Info
  scrollX: number
  scrollY: number
  getPixelPosition: (timestamp: number) => number
  shifted: λFile[]
}

export interface Status {
  codes: number[]
  timestamp: number
  heights: number[]
}

export type StatusMap = Map<number, Status> & Hardcode.Scale;
type Engines = {
  [key in Engine.List]: Engine.Interface<any>
}

export interface Dot {
  x: number
  y: number
  color: string
}

export class RenderEngine implements RenderEngineConstructor, Engines {
  ctx!: CanvasRenderingContext2D
  limits!: MinMax
  info!: Info
  getPixelPosition!: (timestamp: number) => number
  scrollX!: number
  scrollY!: number
  segmentSize = 500
  ruler!: RulerDrawer
  private static instance: RenderEngine | null = null
  default!: DefaultEngine
  height!: HeightEngine
  graph!: GraphEngine
  shifted: λFile[] = []

  constructor({
    ctx,
    limits,
    info,
    getPixelPosition,
    scrollY,
    scrollX,
    shifted,
  }: RenderEngineConstructor) {
    if (RenderEngine.instance) {
      RenderEngine.instance.ruler = new RulerDrawer({
        ctx,
        getPixelPosition,
        scrollX,
        scale: info.app.timeline.scale,
        selected: info.app.timeline.frame,
        width: info.width,
      })
      RenderEngine.instance.ctx = ctx
      RenderEngine.instance.limits = limits
      RenderEngine.instance.info = info
      RenderEngine.instance.scrollX = scrollX
      RenderEngine.instance.shifted = shifted
      RenderEngine.instance.scrollY = scrollY
      RenderEngine.instance.getPixelPosition = getPixelPosition
      RenderEngine.instance.default = new DefaultEngine(RenderEngine.instance)
      RenderEngine.instance.height = new HeightEngine(RenderEngine.instance)
      RenderEngine.instance.graph = new GraphEngine(RenderEngine.instance)
      return RenderEngine.instance
    }

    this.ruler = new RulerDrawer({
      ctx,
      getPixelPosition,
      scrollX,
      scale: info.app.timeline.scale,
      selected: info.app.timeline.frame,
      width: info.width,
    })
    this.ctx = ctx
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.font = '10px monospace'
    this.limits = limits
    this.shifted = shifted
    this.info = info
    this.getPixelPosition = getPixelPosition

    this.default = new DefaultEngine(this)
    this.height = new HeightEngine(this)
    this.graph = new GraphEngine(this)
    RenderEngine.instance = this
    return this
  }

  public lines = (file: λFile) => {
    this.ctx.textRendering = 'optimizeLegibility';

    const color = stringToHexColor(File.context(this.info.app, file).name)
    const y = File.getHeight(this.info.app, file, this.scrollY)

    this.ctx.fillStyle = color
    this.ctx.fillRect(0, y + 23, window.innerWidth, 1)

    this.fill(
      color,
      y,
      !this.shifted.find((shiftedFile) => shiftedFile.id === file.id),
    )
  }

  public primary = (file: λFile) => {
    const y = File.getHeight(this.info.app, file, this.scrollY)

    this.ctx.fillStyle = stringToHexColor(
      File.context(this.info.app, file).name,
    )
    this.ctx.fillRect(0, y - 25, window.innerWidth, 1)
  }

  public fill = (color: Color, y: number, isShifted: boolean) => {
    this.ctx.fillStyle = color + (isShifted ? 12 : 32)
    this.ctx.fillRect(0, y - 24, window.innerWidth, 48)
  }

  public links = () => {
    this.info.app.target.links.forEach((link) => {
      if (link.doc_ids.some(id => !File.id(this.info.app, Event.id(this.info.app, id)?.['gulp.source_id'])?.selected))
        return

      const { dots } = this.calcDots(link)

      this.connection(dots)
      dots.forEach((dot) => this.dot(dot))
    })
  }

  public highlight = (x: number, width: number, index: number, color: string) => {
    this.ctx.fillStyle = mappedColors[color];

    const y = 32 * (index + 1);

    const height = this.ctx.canvas.height - (20 * 2 * (index + 1));

    this.ctx.fillRect(x, y, width, height);
  }

  public connection = (dots: Dot[]) => {
    try {
      if (dots.length < 2) return

      for (let i = 0; i < dots.length - 1; i++) {
        this.ctx.lineWidth = 2
        const start = dots[i]
        const end = dots[i + 1] || dots[0]

        const gradient = this.ctx.createLinearGradient(
          start.x,
          start.y,
          end.x,
          end.y,
        )
        gradient.addColorStop(0, start.color)
        gradient.addColorStop(1, end.color)

        this.ctx.strokeStyle = gradient

        this.ctx.beginPath()
        this.ctx.moveTo(start.x, start.y)
        this.ctx.lineTo(end.x, end.y)
        this.ctx.stroke()
      }
    } catch (_) { }
  }

  public dot = ({ x, y, color }: Dot) => {
    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.beginPath()
    if (typeof this.ctx.roundRect == 'function') {
      this.ctx.roundRect(x - 4, y - 4, 8, 8, [999])
    }

    this.ctx.fill()
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    if (typeof this.ctx.roundRect == 'function') {
      this.ctx.roundRect(x - 3, y - 3, 6, 6, [999])
    }

    this.ctx.fill()
  }

  public calcDots = (
    link: λLink,
  ): {
    dots: Dot[]
  } => {
    const dots: Dot[] = []

    link.doc_ids.forEach((id) => {
      const e = Event.id(this.info.app, id);
      if (!e) {
        return;
      }
      const index = File.selected(this.info.app).findIndex(
        (f) => f.id === e['gulp.source_id'],
      )

      const x = this.getPixelPosition(
        Internal.Transformator.toTimestamp(e['@timestamp']) +
        (File.selected(this.info.app)[index]?.settings.offset || 0),
      )
      const y = index * 48 + 20 - this.scrollY || 0
      const color =
        link.color ||
        stringToHexColor(link.doc_ids.map((id) => File.id(this.info.app, Event.id(this.info.app, id)['gulp.source_id'])).toString())

      dots.push({
        x,
        y,
        color: color.endsWith('48') ? color.slice(-2) : color,
      })
    })

    return { dots }
  }

  public locals = (file: λFile) => {
    if (!file.timestamp || !file.timestamp.min) {
      return
    }
    const y = File.getHeight(this.info.app, file, this.scrollY)

    const right = this.getPixelPosition(file.timestamp.max) + 12
    const left = this.getPixelPosition(file.timestamp.min) - 12
    const line = {
      one: y - 6,
      two: y + 4,
      three: y + 14,
    }

    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.fillRect(
      this.getPixelPosition(file.timestamp.max + file.settings.offset) + 1,
      y - 24,
      1,
      48 - 1,
    )
    this.ctx.fillRect(
      this.getPixelPosition(file.timestamp.min + file.settings.offset) - 1,
      y - 24,
      1,
      48 - 1,
    )

    const events = Event.get(this.info.app, file.id).length.toString()

    this.ctx.fillStyle = '#e8e8e8'

    this.ctx.textAlign = 'left'
    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.fillText(file.total.toString(), right, line.one)
    this.ctx.fillStyle = '#a1a1a1'
    this.ctx.fillText(format(file.timestamp.max, 'dd.MM.yyyy'), right, line.two)
    this.ctx.fillStyle = '#0372ef'
    this.ctx.fillText(events, right, line.three)

    this.ctx.textAlign = 'right'
    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.fillText(file.total.toString(), left, line.one)
    this.ctx.fillStyle = '#a1a1a1'
    this.ctx.fillText(format(file.timestamp.min, 'dd.MM.yyyy'), left, line.two)
    this.ctx.fillStyle = '#0372ef'
    this.ctx.fillText(events, left, line.three)

    if (
      this.info.app.general.requests.filter(
        (r) => r.for === file.id && r.status === 'pending',
      ).length
    ) {
      this.loading(file)
    }
  }

  private drawRect(x: number, y: number, w: number, h: number, accent: string, color = '#000000') {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = accent;
    this.ctx.lineWidth = 1

    this.ctx.beginPath()
    this.ctx.roundRect(x, y, w, h, 6)
    this.ctx.fill()
    this.ctx.stroke()
  }

  private drawTextLabel(text: string, x: number, y: number, maxWidth: number, accent: string) {
    this.ctx.font = '10px sans-serif'
    const textWidth = this.ctx.measureText(text).width
    const padding = 4
    const labelWidth = Math.min(Math.max(textWidth + padding * 2, NOTE_SIZE), maxWidth)
    const labelHeight = 14

    const labelX = x - labelWidth / 2

    this.drawRect(labelX, y + NOTE_SIZE - labelHeight - 2, labelWidth, labelHeight, accent)

    // Текст по центру
    this.ctx.fillStyle = '#ffffff'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(text, x, y + NOTE_SIZE - labelHeight / 2 - 2, labelWidth - padding * 2)
  }


  public renderNote = (note: λNote) => {
    const timestamp = Note.timestamp(note)
    const x = this.getPixelPosition(timestamp) + NOTE_OFFSET
    const y = File.getHeight(this.info.app, note.source_id, this.scrollY) + NOTE_OFFSET

    this.ctx.save()

    // Main
    this.drawRect(x, y, NOTE_SIZE, NOTE_SIZE, note.color);
    // Accent
    this.drawRect(x, y + NOTE_SIZE - 4, NOTE_SIZE, 4, note.color, note.color);

    // Icon
    const iconSize = 8
    this.ctx.fillStyle = note.color
    this.ctx.beginPath()
    this.ctx.arc(x + NOTE_SIZE / 2, y + NOTE_SIZE / 2, iconSize / 2, 0, Math.PI * 2)
    this.ctx.fill()

    this.drawTextLabel(note.name, x + 16, y + 20, 64, note.color);

    this.ctx.restore()
  }

  public loading = (file: λFile) => {
    this.ctx.beginPath()
    this.ctx.strokeStyle = '#e8e8e8'
    if (this.ctx.setLineDash) {
      this.ctx.setLineDash([5, 5])
    }

    const height = File.getHeight(this.info.app, file, this.scrollY)
    this.ctx.moveTo(0, height)
    this.ctx.lineTo(2000, height)
    this.ctx.stroke()
    if (this.ctx.setLineDash) {
      this.ctx.setLineDash([])
    }
  }

  public draw_info = (file: λFile) => {
    const y = File.getHeight(this.info.app, file, this.scrollY) + 4;
    const x = 10;
    const lineHeight = 14;

    const lines: Array<{ text: string; dy: number; color: string }> = [
      { text: file.name, dy: 0, color: '#e8e8e8' },
      { text: File.events(this.info.app, file).length.toString(), dy: lineHeight, color: '#e8e8e8' },
      { text: `${file.total.toString()} | ${File.context(this.info.app, file).name}`, dy: -lineHeight, color: '#a1a1a1' },
    ];

    this.ctx.font = '12px sans-serif';

    this.ctx.textAlign = 'left';
    for (const { text, dy, color } of lines) {
      this.ctx.fillStyle = color;
      this.ctx.fillText(text, x, y + dy);
    }
  }

  public target = () => {
    if (!this.info.app.timeline.target) return

    const file = File.id(this.info.app, this.info.app.timeline.target['gulp.source_id'])

    if (!file) return

    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.fillRect(
      0,
      File.selected(this.info.app).findIndex((f) => f.id === file.id) * 48 +
      23 -
      this.scrollY,
      window.innerWidth,
      1,
    )
    this.ctx.fillRect(
      this.getPixelPosition(
        this.info.app.timeline.target.timestamp + file.settings.offset,
      ),
      0,
      1,
      window.innerWidth,
    )
  }

  // public draw_notes() {
  //   this.info.app.target.notes.forEach(note => {
  //     note.
  //   })
  // }
}
