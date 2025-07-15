import { Internal, MinMax, Note } from '@/class/Info'
import { Event, Info, File } from './Info'
import { Color, stringToHexColor } from '@/ui/utils'
import { format } from 'date-fns'
import { RulerDrawer } from './Ruler.drawer'
import { DefaultEngine } from '../engines/Default.engine'
import { Engine, Hardcode, λCache } from './Engine.dto'
import { HeightEngine } from '../engines/Height.engine'
import { GraphEngine } from '../engines/Graph.engine'
import { λFile, λLink, λNote } from '@/dto/Dataset'
import { getCanvasIcon } from '@/ui/CanvasIcon'
import { Logger } from '@/dto/Logger.class'
import { Glyph } from '@/ui/Glyph'
import { λEvent } from '@/dto/ChunkEvent.dto'

const NOTE_SIZE = 32;
const NOTE_OFFSET = NOTE_SIZE / 2 * -1;

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
}

export interface Status {
  codes: number[]
  timestamp: number
  heights: number[]
}

export type StatusMap = Map<number, Status> & {
  [Hardcode.Scale]: number;
};
type Engines = {
  [key in Engine.List]: Engine.Interface<any>
}

export interface Dot {
  x: number
  y: number
  color: string
}

type Group = [index: number, count: number];

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

  // CACHE
  private static [λCache] = {
    notes: new Map() as Map<λFile['id'], Group[]> & { [Hardcode.Scale]: number },
    range: new Map() as Map<λFile['id'], MinMax & {
      [Hardcode.Length]: number,
      field: keyof λEvent
    }>
  };

  constructor({
    ctx,
    limits,
    info,
    getPixelPosition,
    scrollY,
    scrollX,
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

    if (this.info.app.general.loadings.byFileId.has(file.id)) {
      this.loading(file)
    }
  }

  private drawRect(x: number, y: number, w: number, h: number, r: number, accent: string, color = '#000000') {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = accent;
    this.ctx.lineWidth = 1

    this.ctx.beginPath()
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(x, y, w, h, r)
    } else {
      this.ctx.rect(x, y, w, h)
    }
    this.ctx.fill()
    this.ctx.stroke()
  }

  private drawTextLabel(text: string, x: number, y: number, maxWidth: number, accent: string) {
    this.ctx.font = '10px "GeistMono", sans-serif'
    const textWidth = this.ctx.measureText(text).width
    const padding = 5
    const labelWidth = Math.min(Math.max(textWidth + padding * 2, NOTE_SIZE), maxWidth)
    const labelHeight = 20

    const labelX = x - labelWidth / 2

    this.drawRect(labelX, y + NOTE_SIZE - labelHeight - 2, labelWidth, labelHeight, 5, accent)

    this.ctx.fillStyle = '#ffffff'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    let displayText = text
    if (textWidth > maxWidth - padding * 2) {
      while (this.ctx.measureText(displayText + '...').width > maxWidth - padding * 2 && displayText.length > 0) {
        displayText = displayText.slice(0, -1)
      }
      displayText += '...'
    }

    this.ctx.fillText(displayText, x, y + NOTE_SIZE - labelHeight / 2 - 2)
  }

  public renderNote = async (note: λNote) => {
    const timestamp = Note.timestamp(note)
    const x = this.getPixelPosition(timestamp) + NOTE_OFFSET
    const y = File.getHeight(this.info.app, note.source_id, this.scrollY) + NOTE_OFFSET

    this.ctx.save()

    if (!note.color) {
      note.color = '#e8e8e8';
    }
    // Main
    this.drawRect(x, y, NOTE_SIZE, NOTE_SIZE, 5, note.color);
    // Accent
    this.drawRect(x, y + NOTE_SIZE - 4, NOTE_SIZE, 4, 4, note.color, note.color);

    try {
      const icon = getCanvasIcon({
        name: Note.icon(note),
        color: note.color
      })

      const iconSize = 16
      const iconX = x + (NOTE_SIZE - iconSize) / 2
      const iconY = y + (NOTE_SIZE - iconSize) / 2 - 1

      this.ctx.drawImage(icon, iconX, iconY, iconSize, iconSize)
    } catch (error) {
      Logger.error(`Failed to load image for note ${note.id}. \n${JSON.stringify(error)}`, RenderEngine.name);
      const iconSize = 8
      this.ctx.fillStyle = note.color
      this.ctx.beginPath()
      this.ctx.arc(x + NOTE_SIZE / 2, y + NOTE_SIZE / 2, iconSize / 2, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.drawTextLabel(note.name, x + NOTE_SIZE / 2, y + 26, 120, note.color);

    this.ctx.restore()
  }

  private getVisibleNotes = (file: λFile['id']) => {
    const notes = Note.findByFile(this.info.app, file);
    const min = this.getTimestamp(-128)
    const max = this.getTimestamp(this.ctx.canvas.width + 128)

    // Since notes are sorted in descending order, we need to find:
    // - first note <= max (leftmost visible note)
    // - last note >= min (rightmost visible note)
    const start = this.binarySearchDesc(notes, max, true)  // Find first note <= max
    const end = this.binarySearchDesc(notes, min, false)   // Find last note >= min

    if (start === -1 || end === -1 || start > end) return [];

    return notes.slice(start, end + 1);
  }

  private calculateNotesGroups(file: λFile['id']): {
    notes: λNote[],
    groups: Group[]
  } {
    const notes = this.getVisibleNotes(file);
    if (notes.length === 0) {
      RenderEngine[λCache].notes.set(file, [])
      RenderEngine[λCache].notes[Hardcode.Scale] = this.info.app.timeline.scale
      return {
        notes: [],
        groups: []
      }
    }

    if (RenderEngine[λCache].notes[Hardcode.Scale] === this.info.app.timeline.scale && RenderEngine[λCache].notes.has(file)) {
      return {
        notes,
        groups: RenderEngine[λCache].notes.get(file)!
      }
    }

    const groups: Group[] = []

    for (let i = 0; i < notes.length;) {
      const groupEndIdx = this.findGroupEndIndexDirect(notes, i)
      groups.push([i, groupEndIdx - i + 1])
      i = groupEndIdx + 1
    }

    RenderEngine[λCache].notes.set(file, groups)
    RenderEngine[λCache].notes[Hardcode.Scale] = this.info.app.timeline.scale
    return { notes, groups };
  }

  public getTimestamp = (x: number): number => {
    const visibleWidth = this.ctx.canvas.width * this.info.app.timeline.scale;
    const pixelOffset = x + this.scrollX
    return this.info.app.timeline.frame.min + (pixelOffset / visibleWidth) * (this.info.app.timeline.frame.max - this.info.app.timeline.frame.min)
  }

  // Fixed binary search for descending order
  private binarySearchDesc(notes: λNote[], timestamp: number, findFirst: boolean): number {
    let left = 0, right = notes.length - 1, result = -1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const noteTime = Note.timestamp(notes[mid])

      if (findFirst) {
        // Finding first note <= timestamp (leftmost)
        if (noteTime <= timestamp) {
          result = mid
          right = mid - 1  // Look for earlier index (smaller timestamp)
        } else {
          left = mid + 1   // Current note too large, go right
        }
      } else {
        // Finding last note >= timestamp (rightmost)
        if (noteTime >= timestamp) {
          result = mid
          left = mid + 1   // Look for later index (larger timestamp)
        } else {
          right = mid - 1  // Current note too small, go left
        }
      }
    }

    return result
  }

  private findGroupEndIndexDirect(notes: λNote[], startIdx: number): number {
    const startTimestamp = Note.timestamp(notes[startIdx])
    const startX = this.getPixelPosition(startTimestamp)

    // Since notes are in descending order, we search forward (higher indices = earlier timestamps)
    // but we want to group notes that are close in pixel position
    let endIdx = startIdx

    // Linear search forward to find all notes within 24 pixels
    for (let i = startIdx + 1; i < notes.length; i++) {
      const currentX = this.getPixelPosition(Note.timestamp(notes[i]))
      const distance = Math.abs(currentX - startX)

      if (distance <= 32) {
        endIdx = i
      } else {
        break  // Since we're going in timestamp order, if this one is too far, the rest will be too
      }
    }

    return endIdx
  }

  public static getNotesByX = (file: λFile, x: number, padding = 16): λNote[] => {
    if (!RenderEngine.instance) {
      return [];
    }

    const { notes, groups } = RenderEngine.instance.calculateNotesGroups(file.id);
    if (groups.length === 0) {
      return [];
    }

    let bestGroup: [number, number] | null = null;
    let bestDistance = Infinity;

    for (const [groupIndex, groupCount] of groups) {
      const startNote = notes[groupIndex];
      const endNote = notes[groupIndex + groupCount - 1];

      const startX = RenderEngine.instance.getPixelPosition(Note.timestamp(startNote));
      const endX = RenderEngine.instance.getPixelPosition(Note.timestamp(endNote));

      const avgX = (startX + endX) / 2;
      const distance = Math.abs(avgX - x + 16);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestGroup = [groupIndex, groupCount];
      } else {
        break;
      }
    }

    if (bestGroup) {
      const [groupIndex, groupCount] = bestGroup;
      return notes.slice(groupIndex, groupIndex + groupCount);
    }

    return [];
  }


  public static reset = (key: keyof typeof RenderEngine[typeof λCache]) => {
    RenderEngine[λCache][key].clear();
  }

  public notes = (files: λFile[]) => {
    files.forEach(file => {
      const { notes, groups } = this.calculateNotesGroups(file.id);
      if (!notes.length) {
        return;
      }

      groups.forEach(async (group) => {
        if (group[1] === 1) {
          this.renderNote(notes[group[0]])
        } else {
          this.renderNote({
            ...notes[group[0]],
            name: `${group[1]}`,
            color: '#e8e8e8',
            glyph_id: Glyph.getIdByName('Status')
          })
        }
      })
    })
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
}
