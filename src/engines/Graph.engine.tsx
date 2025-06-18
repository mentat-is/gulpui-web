import { Engine, Hardcode } from '../class/Engine.dto'
import { Dot, RenderEngine } from '../class/RenderEngine'
import { Gradients, throwableByTimestamp, λColor } from '@/ui/utils'
import { λFile } from '@/dto/Dataset'

export class GraphEngine implements Engine.Interface<typeof GraphEngine.target> {
  private renderer!: RenderEngine
  private static instance: GraphEngine | null = null
  private static target: Map<number, number> & {
    [Hardcode.Scale]: number
    [Hardcode.MaxHeight]: number
    [Hardcode.Start]: number
    [Hardcode.End]: number
  }
  map = new Map<λFile['id'], typeof GraphEngine.target>()

  constructor(renderer: Engine.Constructor) {
    if (GraphEngine.instance) {
      GraphEngine.instance.renderer = renderer
      return GraphEngine.instance
    }
    this.renderer = renderer
    GraphEngine.instance = this
  }

  render(file: λFile, y: number) {
    const graphs = this.getCachedOrGenerate(file)
    const maxHeight = graphs[Hardcode.MaxHeight]

    let lastDot: Dot | null = null

    for (const [timestamp, height] of graphs) {
      const x = this.renderer.getPixelPosition(timestamp)
      if (throwableByTimestamp(timestamp, this.renderer.limits, this.renderer.info.app)) continue;
      const dotY = y + 47 - Math.floor((height / maxHeight) * 47)
      const color = λColor.gradient(file.color as Gradients, height, {
        min: 0,
        max: maxHeight
      })

      this.renderer.ctx.font = '8px Arial'
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

  private getCachedOrGenerate(file: λFile): typeof GraphEngine.target {
    const cached = this.map.get(file.id)
    const currentScale = this.renderer.info.app.timeline.scale
    const { min: limitMin, max: limitMax } = this.renderer.limits

    if (cached &&
      cached[Hardcode.Scale] === currentScale &&
      cached[Hardcode.Start] <= limitMax &&
      cached[Hardcode.End] >= limitMin) {
      return cached
    }

    return this.get(file)
  }

  get(file: λFile): typeof GraphEngine.target {
    const heightData = this.renderer.height.get(file)
    const result = new Map() as typeof GraphEngine.target

    const entries = Array.from(heightData.entries())
    let lastRenderedX = -Infinity
    let maxHeight = 0;

    for (let i = 0; i < entries.length; i++) {
      const [timestamp, height] = entries[i]
      const x = this.renderer.getPixelPosition(timestamp)

      if (x - lastRenderedX < 8) {
        const prevTimestamp = Array.from(result.keys()).pop()
        if (prevTimestamp !== undefined) {
          const prevHeight = result.get(prevTimestamp) || 0
          result.set(prevTimestamp, prevHeight + height)
        }
        continue
      }

      const prevEntry = i > 0 ? entries[i - 1] : null

      if (prevEntry) {
        const [prevTimestamp] = prevEntry
        const prevX = this.renderer.getPixelPosition(prevTimestamp)
        const gap = Math.abs(x - prevX)

        if (gap > 16) {
          const steps = Math.floor(gap / 16)
          const timestampStep = (timestamp - prevTimestamp) / (steps + 1)

          for (let step = 1; step <= steps; step++) {
            const fillTimestamp = prevTimestamp + timestampStep * step
            const fillX = this.renderer.getPixelPosition(fillTimestamp)

            if (fillX - lastRenderedX >= 8) {
              result.set(fillTimestamp, 0)
              lastRenderedX = fillX
            }
          }
        }
      }

      result.set(timestamp, height)
      maxHeight = Math.max(maxHeight, height);
      lastRenderedX = x
    }

    const timestamps = Array.from(result.keys())

    result[Hardcode.Scale] = this.renderer.info.app.timeline.scale;
    result[Hardcode.MaxHeight] = maxHeight;
    result[Hardcode.Start] = timestamps[0] ?? 0;
    result[Hardcode.End] = timestamps[timestamps.length - 1] ?? 0;

    this.map.set(file.id, result)

    return result
  }

  is(file: λFile): boolean {
    return this.map.has(file.id)
  }
}