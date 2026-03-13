import { MinMax } from '@/class/Info'
import { Info } from './Info'
import { stringToHexColor } from '@/ui/utils'
import { format } from 'date-fns'
import { RulerDrawer } from './Ruler.drawer'
import { DefaultEngine } from '../engines/Default.engine'
import { Engine, Hardcode, CacheKey } from './Engine.dto'
import { HeightEngine } from '../engines/Height.engine'
import { GraphEngine } from '../engines/Graph.engine'
import { getCanvasIcon, CanvasIcon } from '@/ui/CanvasIcon'
import { Logger } from '@/dto/Logger.class'
import { Source } from '@/entities/Source'
import { Doc } from '@/entities/Doc'
import { Link } from '@/entities/Link'
import { Note } from '@/entities/Note'
import { Glyph } from '@/entities/Glyph'
import { Request } from '@/entities/Request'
import { Internal } from '@/entities/addon/Internal'
import { Color } from '@/entities/Color'
import { Operation } from '@/entities/Operation'

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
  mouseX?: number;
  mouseY?: number;
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
  mouseX?: number;
  mouseY?: number;
  segmentSize = 500
  ruler!: RulerDrawer
  private static instance: RenderEngine | null = null
  default!: DefaultEngine
  height!: HeightEngine
  graph!: GraphEngine
  shifted: Source.Type[] = []
  
  // INTERACTIVE ELEMENTS IN CANVAS saved to manage clicks for notes and links
  public static interactiveNotes: Array<{ 
    notes: Note.Type[], 
    rect: { x: number, y: number, w: number, h: number }
  }> = [];

  public static interactiveLinks: Array<{ 
    link: Link.Type, 
    rect: { x: number, y: number, w: number, h: number } 
  }> = [];

  // CACHE
  private static [CacheKey] = {
    notes: new Map() as Map<Source.Id, Group[]> & { [Hardcode.Scale]: number },
    range: new Map() as Map<Source.Id, MinMax & {
      [Hardcode.Length]: number,
      field: keyof Doc.Type
    }>,
    flags: new Map() as Map<Doc.Id, {
      // Y coordinate
      y: number,
      // timestamp
      t: number,
      // offset
      o: number
    }>
  };

  /**
   * Creates or updates the singleton RenderEngine instance.
   *
   * SINGLETON PATTERN: If an instance already exists, updates its properties
   * (ctx, limits, scroll, etc.) and calls `updateRenderer()` on each sub-engine
   * instead of creating new DefaultEngine/HeightEngine/GraphEngine instances.
   * This avoids 3 constructor calls + singleton checks per frame.
   *
   * On first call, initializes the singleton with canvas context settings
   * (image smoothing, font) and creates the sub-engines.
   */
  constructor({
    ctx,
    limits,
    info,
    getPixelPosition,
    scrollY,
    scrollX,
    mouseX,
    mouseY
  }: RenderEngineConstructor) {
    if (RenderEngine.instance) {
      RenderEngine.instance.ruler = new RulerDrawer({
        ctx,
        getPixelPosition,
        scrollX,
        scale: info.app.timeline.scale,
        selected: info.app.timeline.frame,
        width: info.width
      })
      RenderEngine.instance.ctx = ctx
      RenderEngine.instance.limits = limits
      RenderEngine.instance.info = info
      RenderEngine.instance.scrollX = scrollX
      RenderEngine.instance.scrollY = scrollY
      RenderEngine.instance.mouseX = mouseX;
      RenderEngine.instance.mouseY = mouseY;
      RenderEngine.instance.getPixelPosition = getPixelPosition
      // Reuse engine singletons — only update their RenderEngine reference.
      // Avoids `new DefaultEngine()` etc. which would enter each constructor,
      // check the singleton, and return the existing instance anyway.
      RenderEngine.instance.default.updateRenderer(RenderEngine.instance)
      RenderEngine.instance.height.updateRenderer(RenderEngine.instance)
      RenderEngine.instance.graph.updateRenderer(RenderEngine.instance)
      return RenderEngine.instance
    }
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.ruler = new RulerDrawer({
      ctx,
      getPixelPosition,
      scrollX,
      scale: info.app.timeline.scale,
      selected: info.app.timeline.frame,
      width: info.width
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

  public lines = (file: Source.Type) => {
    const color = stringToHexColor(file.context_id)
    const y = Source.Entity.getHeight(this.info.app, file, this.scrollY)

    this.ctx.fillStyle = color
    this.ctx.fillRect(0, y + 23, window.innerWidth, 1)

    this.fill(
      color,
      y,
      !this.shifted.find((shiftedSource) => shiftedSource.id === file.id),
    )
  }

  public primary = (file: Source.Type) => {
    const y = Source.Entity.getHeight(this.info.app, file, this.scrollY)

    this.ctx.fillStyle = stringToHexColor(file.context_id);
    this.ctx.fillRect(0, y - 25, window.innerWidth, 1)
  }

  public fill = (color: string, y: number, isShifted: boolean) => {
    this.ctx.fillStyle = color + (isShifted ? 12 : 32)
    this.ctx.fillRect(0, y - 24, window.innerWidth, 48)
  }

  /* LINK MANAGEMENT */  

  public links = () => {
    RenderEngine.interactiveLinks = [];
    const canvasWidth = this.ctx.canvas.width;

    this.info.app.target.links.forEach((link) => {
      if (link.doc_ids.some(id => !Source.Entity.id(this.info.app, Doc.Entity.id(this.info.app, id)?.['gulp.source_id'])?.selected))
        return

      const { dots } = this.calcDots(link)

    const allOutsideLeft = dots.every(d => d.x < -50);
    const allOutsideRight = dots.every(d => d.x > canvasWidth + 50);
    if (allOutsideLeft || allOutsideRight) return;

    this.connection(dots)
    dots.forEach((dot) => this.dot(dot))

    // NUOVO: Calcoliamo i punti centrali tra i dot e disegniamo il badge del Link
    if (dots.length >= 2) {
      for (let i = 0; i < dots.length - 1; i++) {
        const start = dots[i];
        const end = dots[i + 1];
        
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        this.renderLinkBadge(link, midX, midY);
      }
    }
    })
  }

  public renderLinkBadge = (link: Link.Type, x: number, y: number) => {
    const size = 24; 
    const rectX = x - size / 2;
    const rectY = y - size / 2;
    const color = link.color || Color.Themer.theme.FONT_ACCENT;

    const isHovered = this.mouseX !== undefined && this.mouseY !== undefined &&
                      this.mouseX >= rectX && this.mouseX <= rectX + size &&
                      this.mouseY >= rectY && this.mouseY <= rectY + size;

    this.ctx.save();
    
    // EFFETTO HOVER
    if (isHovered) {
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 12;
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#FFFFFF';
    }

    this.drawRect(rectX, rectY, size, size, 4, color, Color.Themer.theme.BACKGROUND_SECOND);
    if (isHovered) this.ctx.stroke();

    const iconName = Link.Entity.icon(link); 
    const icon = getCanvasIcon({ name: iconName, color });
    const iconSize = 16;
    this.ctx.drawImage(icon, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
    this.ctx.restore();

    RenderEngine.interactiveLinks.push({
      link,
      rect: { x: rectX, y: rectY, w: size, h: size }
    });
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

  /* HIGHLIGHT MANAGEMENT */
  public highlight = (x: number, width: number, index: number, color: string) => {
    this.ctx.fillStyle = mappedColors[color];

    const y = 32 * (index + 1);

    const height = this.ctx.canvas.height - (20 * 2 * (index + 1));

    this.ctx.fillRect(x, y, width, height);
  }

  private getYForDoc = (id: Doc.Id): { y: number, t: number, o: number } => {
    const e = RenderEngine[CacheKey].flags.get(id);
    if (!e) {
      const operation = Operation.Entity.selected(this.info.app);
      const docs = Doc.Entity.flag.getDocs(this.info.app, operation?.id);

      let result = {
        y: 0,
        t: 0,
        o: 0
      }

      docs.forEach(doc => {
        const p = {
          y: Source.Entity.getHeight(this.info.app, doc['gulp.source_id'], 0),
          t: doc.timestamp,
          o: Source.Entity.id(this.info.app, doc['gulp.source_id']).settings.offset ?? 0
        };
        if (doc._id === id) {
          result = p;
        }
        RenderEngine[CacheKey].flags.set(doc._id, p);
      });

      return result;
    }
    return e;
  }
  /**
   * Draws green line on position of every flagged event for the current operation
   */
  public highlightFlaggedDocuments = () => {
    const operation = Operation.Entity.selected(this.info.app);
    const flagged = Doc.Entity.flag.getList(operation?.id);
    const canvasWidth = this.ctx.canvas.width;

    for (const id of flagged) {
      const { y, t, o } = this.getYForDoc(id);

      const x = this.getPixelPosition(t + o);
      //if event is outside canvas, skip it
      if (x < -10 || x > canvasWidth + 10) continue;
      const dy = y - 24 - this.scrollY;

      this.ctx.fillStyle = '#00FF00';
      this.ctx.fillRect(x - 1, dy - 2, 1, 51);
      this.ctx.fillRect(x, dy - 4, 1, 55);
      this.ctx.fillRect(x + 1, dy - 2, 1, 51);
    }
  }

  /* NOTE MANAGEMENT */
  public renderNote = (note: Note.Type, groupNotes: Note.Type[] = [note]) => {
    const timestamp = Note.Entity.timestamp(note)
    const x = this.getPixelPosition(timestamp) + NOTE_OFFSET
    const y = Source.Entity.getHeight(this.info.app, note.source_id, this.scrollY) + NOTE_OFFSET

    // Hit detection per l'Hover
    const isHovered = this.mouseX !== undefined && this.mouseY !== undefined &&
                      this.mouseX >= x && this.mouseX <= x + NOTE_SIZE &&
                      this.mouseY >= y && this.mouseY <= y + NOTE_SIZE;

    this.ctx.save()

    if (!note.color) {
      note.color = Color.Themer.theme.FONT_ACCENT;
    }

    // EFFETTO HOVER
    if (isHovered) {
      this.ctx.shadowColor = note.color;
      this.ctx.shadowBlur = 12; // Effetto Glow
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#FFFFFF';
    }

    // Main
    this.drawRect(x, y, NOTE_SIZE, NOTE_SIZE, 5, note.color);
    // Accent
    this.drawRect(x, y + NOTE_SIZE - 4, NOTE_SIZE, 4, 4, note.color, note.color);

    if (isHovered) this.ctx.stroke();

    const icon = getCanvasIcon({ name: Note.Entity.icon(note), color: note.color })
    const iconSize = 16
    const iconX = x + (NOTE_SIZE - iconSize) / 2
    const iconY = y + (NOTE_SIZE - iconSize) / 2 - 1

    this.ctx.drawImage(icon, iconX, iconY, iconSize, iconSize)

    this.drawTextLabel(note.name, x + NOTE_SIZE / 2, y + 26, 120, note.color);
    this.ctx.restore()

    RenderEngine.interactiveNotes.push({
      notes: groupNotes,
      rect: { x, y, w: NOTE_SIZE, h: NOTE_SIZE }
    });
  }

  private getVisibleNotes = (file: Source.Id) => {
    const notes = Note.Entity.findByFile(this.info.app, file);
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

  private calculateNotesGroups(file: Source.Id): {
    notes: Note.Type[],
    groups: Group[]
  } {
    const notes = this.getVisibleNotes(file);
    if (notes.length === 0) {
      RenderEngine[CacheKey].notes.set(file, [])
      RenderEngine[CacheKey].notes[Hardcode.Scale] = this.info.app.timeline.scale
      return {
        notes: [],
        groups: []
      }
    }

    if (RenderEngine[CacheKey].notes[Hardcode.Scale] === this.info.app.timeline.scale && RenderEngine[CacheKey].notes.has(file)) {
      return {
        notes,
        groups: RenderEngine[CacheKey].notes.get(file)!
      }
    }

    const groups: Group[] = []

    for (let i = 0; i < notes.length;) {
      const groupEndIdx = this.findGroupEndIndexDirect(notes, i)
      groups.push([i, groupEndIdx - i + 1])
      i = groupEndIdx + 1
    }

    RenderEngine[CacheKey].notes.set(file, groups)
    RenderEngine[CacheKey].notes[Hardcode.Scale] = this.info.app.timeline.scale
    return { notes, groups };
  }

   private findGroupEndIndexDirect(notes: Note.Type[], startIdx: number): number {
    const startTimestamp = Note.Entity.timestamp(notes[startIdx])
    const startX = this.getPixelPosition(startTimestamp)

    // Since notes are in descending order, we search forward (higher indices = earlier timestamps)
    // but we want to group notes that are close in pixel position
    let endIdx = startIdx

    // Linear search forward to find all notes within 24 pixels
    for (let i = startIdx + 1; i < notes.length; i++) {
      const currentX = this.getPixelPosition(Note.Entity.timestamp(notes[i]))
      const distance = Math.abs(currentX - startX)

      if (distance <= 32) {
        endIdx = i
      } else {
        break  // Since we're going in timestamp order, if this one is too far, the rest will be too
      }
    }

    return endIdx
  }

   // Fixed binary search for descending order
  private binarySearchDesc(notes: Note.Type[], timestamp: number, findFirst: boolean): number {
    let left = 0, right = notes.length - 1, result = -1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const noteTime = Note.Entity.timestamp(notes[mid])

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

    public notes = (files: Source.Type[]) => {
    RenderEngine.interactiveNotes = [];
    if (!files || !files.length) return;
    files.forEach(file => {
      const { notes, groups } = this.calculateNotesGroups(file.id);
      if (!notes.length) {
        return;
      }

      groups.forEach((group) => {
        if (!group || group.length < 2 || !notes[group[0]]) return;
        
        const groupNotes = notes.slice(group[0], group[0] + group[1]);
        if (group[1] === 1 && notes[group[0]]) {
          this.renderNote(notes[group[0]])
        } else {
          this.renderNote({
            ...notes[group[0]],
            name: `${group[1]}`,
            color: Color.Themer.theme.FONT_ACCENT,
            glyph_id: Glyph.getIdByName('Status')
          }, groupNotes)
        }
      })
    })
  }

  /* CANVAS DRAW Utility*/

  public dot = ({ x, y, color }: Dot) => {
    this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
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
    link: Link.Type,
  ): {
    dots: Dot[]
  } => {
    const dots: Dot[] = []

    link.doc_ids.forEach((id) => {
      const e = Doc.Entity.id(this.info.app, id);
      if (!e) {
        return;
      }
      const index = Source.Entity.selected(this.info.app).findIndex(f => f.id === e['gulp.source_id']);

      const x = this.getPixelPosition(
        Internal.Transformator.toTimestamp(e['@timestamp']) +
        (Source.Entity.selected(this.info.app)[index]?.settings.offset || 0),
      )
      const y = index * 48 + 20 - this.scrollY || 0
      const color =
        link.color ||
        stringToHexColor(link.doc_ids.map((id) => Source.Entity.id(this.info.app, Doc.Entity.id(this.info.app, id)['gulp.source_id'])).toString())

      dots.push({
        x,
        y,
        color: color.endsWith('48') ? color.slice(-2) : color,
      })
    })

    return { dots }
  }

  public locals = (file: Source.Type) => {
    const y = Source.Entity.getHeight(this.info.app, file, this.scrollY)

    const right = this.getPixelPosition(file.timestamp.max + file.settings.offset) + 12
    const left = this.getPixelPosition(file.timestamp.min + file.settings.offset) - 12
    const line = {
      one: y - 6,
      two: y + 4,
      three: y + 14,
    }

    this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
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

    const events = Doc.Entity.get(this.info.app, file.id).length.toString()

    this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT

    this.ctx.textAlign = 'left'
    this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
    this.ctx.fillText(file.total.toString(), right, line.one)
    this.ctx.fillStyle = Color.Themer.theme.FONT_SECOND
    this.ctx.fillText(format(file.timestamp.max + file.settings.offset, 'dd.MM.yyyy'), right, line.two)
    this.ctx.fillStyle = '#0372ef'
    this.ctx.fillText(events, right, line.three)

    this.ctx.textAlign = 'right'
    this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
    this.ctx.fillText(file.total.toString(), left, line.one)
    this.ctx.fillStyle = Color.Themer.theme.FONT_SECOND
    this.ctx.fillText(format(file.timestamp.min + file.settings.offset, 'dd.MM.yyyy'), left, line.two)
    this.ctx.fillStyle = '#0372ef'
    this.ctx.fillText(events, left, line.three)

    if (this.info.app.general.loadings.byFileId.has(file.id)) {
      this.loading(file)
    }
  }

  private drawRect(x: number, y: number, w: number, h: number, r: number, accent: string, color = Color.Themer.theme.BACKGROUND_SECOND) {
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

    this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
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

  public getTimestamp = (x: number): number => {
    const visibleWidth = this.ctx.canvas.width * this.info.app.timeline.scale;
    const pixelOffset = x + this.scrollX
    return this.info.app.timeline.frame.min + (pixelOffset / visibleWidth) * (this.info.app.timeline.frame.max - this.info.app.timeline.frame.min)
  }

  // TO BE REMOVE USED ONLY IN NOTE.Displayer not used
  public static getNotesByX = (file: Source.Type, x: number, padding = 16): Note.Type[] => {
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

      const startX = RenderEngine.instance.getPixelPosition(Note.Entity.timestamp(startNote));
      const endX = RenderEngine.instance.getPixelPosition(Note.Entity.timestamp(endNote));

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

  public loading = (file: Source.Type) => {
    this.ctx.beginPath()
    this.ctx.strokeStyle = Color.Themer.theme.FONT_ACCENT
    if (this.ctx.setLineDash) {
      this.ctx.setLineDash([5, 5])
    }

    const height = Source.Entity.getHeight(this.info.app, file, this.scrollY)
    this.ctx.moveTo(0, height)
    this.ctx.lineTo(2000, height)
    this.ctx.stroke()
    if (this.ctx.setLineDash) {
      this.ctx.setLineDash([])
    }
  }

  public draw_info = (file: Source.Type) => {
    const y = Source.Entity.getHeight(this.info.app, file, this.scrollY) + 4;
    const x = 10;
    const lineHeight = 14;

    const requestType = Source.Entity.getRequestType(this.info.app, file);
    const suffix = !requestType ? '' : requestType === Request.Prefix.INGESTION
      ? ' | Ingesting...'
      : ' | Loading...';

    const lines: Array<{ text: string; dy: number; color: string }> = [
      { text: file.name + suffix, dy: 0, color: Color.Themer.theme.FONT_ACCENT },
      { text: Source.Entity.events(this.info.app, file).length.toString(), dy: lineHeight, color: Color.Themer.theme.FONT_ACCENT },
      { text: `${file.total.toString()} | ${Source.Entity.context(this.info.app, file).name}` + suffix, dy: -lineHeight, color: Color.Themer.theme.FONT_SECOND },
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

    const file = Source.Entity.id(this.info.app, this.info.app.timeline.target['gulp.source_id'])

    if (!file) return

    this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT
    this.ctx.fillRect(
      0,
      Source.Entity.selected(this.info.app).findIndex((f) => f.id === file.id) * 48 +
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

  /* MEMORY MANAGEMENT */

  /** Clears a specific render cache (notes, range, or flags). Used to force recalculation. */
  public static reset = (key: keyof typeof RenderEngine[typeof CacheKey]) => {
    RenderEngine[CacheKey][key].clear();
  }

  /**
   * Comprehensive memory cleanup — clears ALL render-related caches.
   * Must be called when switching operations to prevent memory leaks.
   *
   * Clears:
   * - RenderEngine's notes, range, and flags caches
   * - DefaultEngine and HeightEngine per-source pixel maps (can hold 320k+ entries)
   * - CanvasIcon SVG-to-bitmap cache
   */
  public static clearAllCaches = () => {
    RenderEngine[CacheKey].notes.clear();
    RenderEngine[CacheKey].range.clear();
    RenderEngine[CacheKey].flags.clear();

    if (DefaultEngine.instance) {
      DefaultEngine.instance.map.clear();
    }
    if (HeightEngine.instance) {
      HeightEngine.instance.map.clear();
      HeightEngine.instance.cacheKeys.clear();
    }
    if (GraphEngine.instance) {
      GraphEngine.instance.map.clear();
    }

    CanvasIcon.cache.clear();
  }
}
