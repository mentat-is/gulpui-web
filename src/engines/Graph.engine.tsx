import { Source } from '@/entities/Source'
import { Engine, Hardcode } from '../class/Engine.dto'
import { Dot, RenderEngine } from '../class/RenderEngine'
import { throwableByTimestamp } from '@/ui/utils'
import { Color } from '@/entities/Color'

/**
 * Graph render engine: draws connected line graphs for event density over time.
 * Caches per-source graph points (Map<timestamp, height>) with scale/range metadata.
 * Sampling uses a time-based threshold (funkysamples algorithm): events within
 * `sampleThresholdMs` of each other are accumulated under a single representative
 * timestamp, producing stable results independent of zoom level.
 *
 * Singleton pattern — reused across frames.
 */
export class GraphEngine implements Engine.Interface<typeof GraphEngine.target> {
  /** Reference to the parent RenderEngine. */
  private renderer!: RenderEngine
  /** Singleton instance, accessible for cache clearing in clearAllCaches(). */
  public static instance: GraphEngine | null = null
  /** Type definition for the per-source graph map with metadata symbols. */
  private static target: Map<number, number> & {
    [Hardcode.Scale]: number
    [Hardcode.MaxHeight]: number
    [Hardcode.Start]: number
    [Hardcode.End]: number
  }
  /** Per-source cache of graph data. Key: source ID, Value: graph point map. */
  map = new Map<Source.Id, typeof GraphEngine.target>()

  /**
   * Time-based sampling threshold in milliseconds.
   * Events whose distance from the previous event is ≤ this value are accumulated
   * under the same sample bucket. Increase to reduce point density; decrease for
   * higher resolution. Changing this value automatically invalidates the cache.
   */
  private sampleThresholdMs: number = Engine.DEFAULT_SAMPLE_SIZE

  constructor(renderer: Engine.Constructor) {
    if (GraphEngine.instance) {
      GraphEngine.instance.renderer = renderer
      return GraphEngine.instance
    }
    this.renderer = renderer
    GraphEngine.instance = this
  }

  /** Updates the renderer reference without constructor overhead. Called per frame. */
  updateRenderer(renderer: Engine.Constructor) {
    this.renderer = renderer
  }

  /**
   * Sets the time-based sampling threshold. The cache is cleared so the next
   * render recomputes data with the new resolution.
   * @param ms - Threshold in milliseconds (e.g. 60000 = 1 minute buckets)
   */
  setSampleThreshold(ms: number) {
    if (ms === this.sampleThresholdMs) return
    this.sampleThresholdMs = ms
    this.map.clear()
  }

  render(file: Source.Type, y: number, force?: boolean) {
    const graphs = this.getCachedOrGenerate(file)
    const maxHeight = graphs[Hardcode.MaxHeight]

    let lastDot: Dot | null = null

    // Set font once before the loop — not per-dot
    this.renderer.ctx.font = '8px Arial'

    for (const [timestamp, height] of graphs) {
      const x = this.renderer.getPixelPosition(timestamp)
      if (throwableByTimestamp(timestamp, this.renderer.limits, this.renderer.info.app)) continue

      const dotY = y + 47 - Math.floor((height / maxHeight) * 47)
      const color = Color.Entity.gradient(file.settings.render_color_palette, height, {
        min: 0,
        max: maxHeight,
      })

      // this.renderer.ctx.strokeStyle = color
      // this.renderer.ctx.beginPath()
      // this.renderer.ctx.moveTo(x, y)
      // this.renderer.ctx.lineTo(x, y+48)
      // this.renderer.ctx.stroke()
      // this.renderer.ctx.closePath()
      this.renderer.ctx.fillStyle = color
      this.renderer.ctx.fillText(height.toString(), x - 3.5, dotY - 8)

      const currentDot = { x, y: dotY, color }

      if (lastDot) {
        this.renderer.connection([currentDot, lastDot])
      }

      this.renderer.dot(currentDot)
      lastDot = currentDot
    }
  }

  private getCachedOrGenerate(file: Source.Type): typeof GraphEngine.target {
    const cached = this.map.get(file.id)
    const currentScale = this.renderer.info.app.timeline.scale

    if (cached && cached[Hardcode.Scale] === currentScale) {
      return cached
    }

    return this.get(file)
  }

  /**
   * Builds the graph dataset from HeightEngine's pre-bucketed data.
   *
   * HeightEngine already groups raw events into fixed time windows
   * (each entry: timestamp → event count in that window). This method
   * copies those entries directly into the result map — each bucket becomes
   * one graph dot positioned at its timestamp, showing the count for that
   * specific time range only (not cumulative).
   *
   * O(N) single pass, maxHeight tracked inline.
   */
  get(file: Source.Type): typeof GraphEngine.target {
    const heightData = this.renderer.height.get(file)
    const result = new Map() as typeof GraphEngine.target
    let maxHeight = 0
    let firstKey: number | undefined
    let lastKey: number | undefined

    for (const [timestamp, height] of heightData) {
      result.set(timestamp, height)
      if (height > maxHeight) maxHeight = height
      if (firstKey === undefined) firstKey = timestamp
      lastKey = timestamp
    }

    result[Hardcode.Scale] = this.renderer.info.app.timeline.scale
    result[Hardcode.MaxHeight] = maxHeight
    result[Hardcode.Start] = firstKey ?? 0
    result[Hardcode.End] = lastKey ?? 0

    this.map.set(file.id, result)
    return result
  }

  is(file: Source.Type): boolean {
    return this.map.has(file.id)
  }
}