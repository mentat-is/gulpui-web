import { Source } from '@/entities/Source';
import { Engine, Hardcode } from '../class/Engine.dto'
import { RenderEngine } from '../class/RenderEngine'
import { throwableByTimestamp } from '@/ui/utils'
import { Color } from '@/entities/Color';
import { Doc } from '@/entities/Doc';

/** Default time-bucket size in milliseconds (30 seconds). */


/**
 * Height-based render engine: draws vertical bars proportional to event density.
 * Caches per-source height maps (Map<timestamp, eventCount>).
 *
 * The `sampleSizeMs` parameter controls bucket width. Smaller values give higher
 * resolution but more cache entries; larger values reduce detail but lower memory use.
 *
 * Singleton pattern — reused across frames.
 */
export class HeightEngine implements Engine.Interface<typeof HeightEngine.target> {
  /** Default time-bucket size in milliseconds (30 seconds). */
 
  /** Singleton instance, accessible for cache clearing in clearAllCaches(). */
  public static instance: HeightEngine | null = null
  static target: Map<number, number> & {
    [Hardcode.MaxHeight]: number;
  };
  /** Reference to the parent RenderEngine. */
  private renderer!: RenderEngine
  /** Per-source cache of height data. Key: source ID, Value: height map. */
  map = new Map<Source.Id, typeof HeightEngine.target>();

  /**
   * Bucket size in milliseconds. Events are grouped into fixed time windows of this
   * width. Configurable so callers can trade resolution for memory and compute cost.
   */
  private sampleSizeMs: number = Engine.DEFAULT_SAMPLE_SIZE

  constructor(renderer: Engine.Constructor) {
    if (HeightEngine.instance) {
      HeightEngine.instance.renderer = renderer
      return HeightEngine.instance
    }
    this.renderer = renderer;
    HeightEngine.instance = this
  }

  /** Updates the renderer reference without constructor overhead. Called per frame. */
  updateRenderer(renderer: Engine.Constructor) {
    this.renderer = renderer
  }

  /**
   * Sets the time-bucket width. The cache is cleared so the next render recomputes
   * data with the new granularity.
   * @param ms - Bucket size in milliseconds (e.g. 60000 = 1-minute buckets)
   */
  setSampleSize(ms: number) {
    if (ms === this.sampleSizeMs) return
    this.sampleSizeMs = ms
    this.map.clear()
    this.cacheKeys.clear()
  }

  render(file: Source.Type, y: number) {
    const samples = this.get(file)
    const height = samples[Hardcode.MaxHeight];

    const { min: visibleStart, max: visibleEnd } = this.renderer.limits

    for (const [timestamp, amount] of samples) {
      const adjustedTime = timestamp + file.settings.offset

      if (
        adjustedTime < visibleStart ||
        adjustedTime > visibleEnd ||
        throwableByTimestamp(adjustedTime, this.renderer.limits, this.renderer.info.app) ||
        amount <= 0
      ) continue

      this.renderer.ctx.fillStyle = Color.Entity.gradient(
        file.settings.render_color_palette,
        amount,
        { min: 0, max: height }
      )

      this.renderer.ctx.fillRect(
        this.renderer.getPixelPosition(adjustedTime),
        y + 47,
        1,
        -(1 + 46 * (amount / height))
      )
    }
  }

  /** Per-source cache key strings, cleared via clearAllCaches() on operation switch. */
  public cacheKeys = new Map<Source.Id, string>();

  /**
   * Computes (or retrieves from cache) the bucketed event density for a source.
   *
   * Funkysamples-inspired approach:
   *   - Events from Source.Entity.events() arrive sorted descending by timestamp.
   *     We iterate them in reverse (ascending) so both events and bucket boundaries
   *     advance in the same direction.
   *   - We walk bucket boundaries (each `sampleSizeMs` apart) and events together
   *     in a single merge pass, avoiding per-event `Math.floor` division.
   *   - Empty buckets (count = 0) are preserved so downstream consumers (GraphEngine)
   *     can render dots across the full timeline, including quiet intervals.
   *
   * O(B + E) where B = number of buckets, E = number of events.
   */
  get(file: Source.Type) {
    const events = Source.Entity.events(this.renderer.info.app, file)
    const minTime = Math.min(file.timestamp.min, file.timestamp.max)
    const maxTime = Math.max(file.timestamp.min, file.timestamp.max)

    // Check cache validity — recompute only when events or bounds changed
    const cacheKey = `${events.length}:${minTime}:${maxTime}:${this.sampleSizeMs}`;
    const existingKey = this.cacheKeys.get(file.id);
    if (existingKey === cacheKey && this.map.has(file.id)) {
      return this.map.get(file.id)!;
    }

    const sampleSize = this.sampleSizeMs
    const sampledData = new Map() as typeof HeightEngine.target;
    let maxHeight = 0

    // Events are sorted descending — iterate in reverse for ascending order
    let eventIdx = events.length - 1
    let bucketStart = minTime

    while (bucketStart <= maxTime) {
      const bucketEnd = bucketStart + sampleSize
      let count = 0

      // Count all events that fall within [bucketStart, bucketEnd)
      while (eventIdx >= 0) {
        const eventTime = Doc.Entity.timestamp(events[eventIdx])

        // Skip events before this bucket (shouldn't happen with sorted data, but safe)
        if (eventTime < bucketStart) {
          eventIdx--
          continue
        }

        // Event belongs to a later bucket — stop counting for this one
        if (eventTime >= bucketEnd) break

        count++
        eventIdx--
      }

      sampledData.set(bucketStart, count)
      if (count > maxHeight) maxHeight = count

      bucketStart = bucketEnd
    }

    sampledData[Hardcode.MaxHeight] = maxHeight;

    this.map.set(file.id, sampledData)
    this.cacheKeys.set(file.id, cacheKey)

    return sampledData;
  }

  is = () => Boolean();
}
