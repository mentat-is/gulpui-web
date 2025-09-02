import { Engine, Hardcode } from '../class/Engine.dto'
import { RenderEngine } from '../class/RenderEngine'
import { Gradient, throwableByTimestamp, λColor } from '@/ui/utils'
import { Event, File } from '../class/Info'
import { λFile } from '@/dto/Dataset'

const SAMPLE_SIZE = 60000;

export class HeightEngine implements Engine.Interface<typeof HeightEngine.target> {
  private static instance: HeightEngine | null = null
  static target: Map<number, number> & {
    [Hardcode.MaxHeight]: number;
  };
  private renderer!: RenderEngine
  map = new Map<λFile['id'], typeof HeightEngine.target>();

  constructor(renderer: Engine.Constructor) {
    if (HeightEngine.instance) {
      HeightEngine.instance.renderer = renderer
      return HeightEngine.instance
    }
    this.renderer = renderer;
    HeightEngine.instance = this
  }

  render(file: λFile, y: number) {
    const samples = this.get(file)
    const height = samples[Hardcode.MaxHeight];

    const { min: visibleStart, max: visibleEnd } = this.renderer.limits

    for (const [timestamp, amount] of samples) {
      const adjustedTime = timestamp + file.settings.offset

      if (adjustedTime < visibleStart || adjustedTime > visibleEnd ||
        throwableByTimestamp(adjustedTime, this.renderer.limits, this.renderer.info.app) ||
        amount <= 0) continue

      this.renderer.ctx.fillStyle = λColor.gradient(
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

  get(file: λFile) {
    const events = File.events(this.renderer.info.app, file)
    const [minTime, maxTime] = [Math.min(file.timestamp.min, file.timestamp.max), Math.max(file.timestamp.min, file.timestamp.max)]

    const bucketCount = Math.ceil((maxTime - minTime) / SAMPLE_SIZE)
    const sampledData = new Map() as typeof HeightEngine.target;

    for (let i = 0; i <= bucketCount; i++) {
      const timestamp = minTime + (i * SAMPLE_SIZE)
      if (timestamp <= maxTime) {
        sampledData.set(timestamp, 0)
      }
    }

    let maxHeight = 0
    events.forEach(event => {
      const eventTime = Event.timestamp(event)
      if (eventTime < minTime || eventTime > maxTime) return

      const bucketStart = minTime + Math.floor((eventTime - minTime) / SAMPLE_SIZE) * SAMPLE_SIZE
      const newCount = (sampledData.get(bucketStart) || 0) + 1
      sampledData.set(bucketStart, newCount)

      if (newCount > maxHeight) maxHeight = newCount
    })

    sampledData[Hardcode.MaxHeight] = maxHeight;

    this.map.set(file.id, sampledData)

    return sampledData;
  }

  is = () => Boolean();
}
