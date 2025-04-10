import { MinMax, Range } from '@/class/Info'
import { Event, Info, File } from './Info'
import { Color, stringToHexColor } from '@/ui/utils'
import { format } from 'date-fns'
import { XY, XYBase } from '@/dto/XY.dto'
import { RulerDrawer } from './Ruler.drawer'
import { DefaultEngine } from '../engines/Default.engine'
import { Scale, Engine } from './Engine.dto'
import { HeightEngine } from '../engines/Height.engine'
import { GraphEngine } from '../engines/Graph.engine'
import { λFile, λLink } from '@/dto/Dataset'

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

export type StatusMap = Map<number, Status> & Scale

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
    this.ctx.imageSmoothingEnabled = false
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

  /**
   * Рисует линию разграничения снизу исходя из названия контекста
   */
  public lines = (file: λFile) => {
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

  /**
   * Рисует линию как из метода `this.lines` но только вверху
   */
  public primary = (file: λFile) => {
    const y = File.getHeight(this.info.app, file, this.scrollY)

    this.ctx.fillStyle = stringToHexColor(
      File.context(this.info.app, file).name,
    )
    this.ctx.fillRect(0, y - 25, window.innerWidth, 1)
  }

  /**
   *
   * @param color `Color` - цвет заливки
   * @param y `number` - позиция по середине `λFile`
   */
  public fill = (color: Color, y: number, isShifted: boolean) => {
    this.ctx.fillStyle = color + (isShifted ? 12 : 32)
    this.ctx.fillRect(0, y - 24, window.innerWidth, 48)
  }

  public links = () => {
    this.info.app.target.links.forEach((link) => {
      if (link.docs.some((e) => !File.id(this.info.app, e.file_id)?.selected))
        return

      const { dots, center } = this.calcDots(link)

      this.connection(dots, center)
      dots.forEach((dot) => this.dot(dot))
    })
  }

  public highlight = (x: number, width: number, index: number, color: string) => {
    this.ctx.fillStyle = mappedColors[color];

    const y = 32 * (index + 1);

    const height = this.ctx.canvas.height + 16 - (32 * 2 * (index + 1));

    // height: calc(100% + 16px - calc(32px * 2 * (var(--index, 0) + 1)));
    // top: calc(32px * (var(--index, 0) + 1));

    this.ctx.fillRect(x, y, width, height);
  }

  public connection = (dots: Dot[], center?: XY) => {
    if (dots.length < 2) return

    for (let i = 0; i < dots.length; i++) {
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

      if (center?.x && center?.y) {
        const centerGradient = this.ctx.createLinearGradient(
          end.x,
          end.y,
          center.x,
          center.y,
        )
        centerGradient.addColorStop(0, end.color + '48')
        centerGradient.addColorStop(1, end.color)

        this.ctx.strokeStyle = centerGradient
        this.ctx.beginPath()
        this.ctx.moveTo(end.x, end.y)
        this.ctx.lineTo(center.x, center.y)
        this.ctx.stroke()
      }
    }
  }

  public dot = ({ x, y, color }: Dot) => {
    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.beginPath()
    this.ctx.roundRect(x - 4, y - 4, 8, 8, [999])
    this.ctx.fill()
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.roundRect(x - 3, y - 3, 6, 6, [999])
    this.ctx.fill()
  }

  public calcDots = (
    link: λLink,
  ): {
    dots: Dot[]
    center: XY
  } => {
    const center = XYBase(0)
    const dots: Dot[] = []

    link.docs.forEach((e) => {
      const index = File.selected(this.info.app).findIndex(
        (f) => f.id === e.file_id,
      )

      const x = this.getPixelPosition(
        e.timestamp +
        (File.selected(this.info.app)[index]?.settings.offset || 0),
      )
      const y = index * 48 + 20 - this.scrollY || 0
      const color =
        link.color ||
        stringToHexColor(link.docs.map((e) => e.file_id).toString())

      center.x += x
      center.y += y

      dots.push({
        x,
        y,
        color: color.endsWith('48') ? color.slice(-2) : color,
      })
    })

    center.x = center.x / (dots.length || 1)
    center.y = center.y / (dots.length || 1)

    return { dots, center }
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

  public loading = (file: λFile) => {
    this.ctx.beginPath()
    this.ctx.strokeStyle = '#e8e8e8'
    this.ctx.setLineDash([5, 5])
    const height = File.getHeight(this.info.app, file, this.scrollY)
    this.ctx.moveTo(0, height)
    this.ctx.lineTo(2000, height)
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  public draw_info = (file: λFile) => {
    const y = File.getHeight(this.info.app, file, this.scrollY) + 4

    this.ctx.textAlign = 'left'
    this.ctx.fillStyle = '#e8e8e8'
    this.ctx.fillText(file.name, 10, y)
    this.ctx.fillText(
      File.events(this.info.app, file).length.toString(),
      10,
      y + 14,
    )

    this.ctx.fillStyle = '#a1a1a1'
    this.ctx.fillText(
      `${file.total.toString()} | ${File.context(this.info.app, file).name}`,
      10,
      y - 14,
    )
  }

  public target = () => {
    if (!this.info.app.timeline.target) return

    const file = File.id(this.info.app, this.info.app.timeline.target.file_id)

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
}
