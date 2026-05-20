import { Source } from '@/entities/Source'
import { Engine, Hardcode } from '../class/Engine.dto'
import { Dot, RenderEngine } from '../class/RenderEngine'
import { throwableByTimestamp } from '@/ui/utils'
import { Color } from '@/entities/Color'

/**
 * Graph render engine: draws connected line graphs for event density over time.
 * Caches per-source graph points (Map<timestamp, height>) with scale/range metadata.
 * Singleton pattern — reused across frames.
 */
export class GraphEngine implements Engine.Interface<typeof GraphEngine.target> {
  /** Reference to the parent RenderEngine. */
  private renderer!: RenderEngine
  /** Singleton instance. */
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

  render(file: Source.Type, y:number, forcr?:boolean) {    
    //retrive sample to draw in graph render
    const sampleData = Source.Entity.samples(this.renderer.info.app, file) ?? [];
    // calculate max height 
    const maxHeight = Math.max(...sampleData.map(obj => obj.sample));
    
    // previous bucket to render with dot
    let prevBucket: any = null;
    let prevCount: number = 0;
    let prevX: number = -1;

    //the last dot rendered to connect with the previous dot to render
    let dotToConnect: Dot | null = null;
    
    for(let i =0; i<sampleData.length; i++){
      let bucket = sampleData[i];
      if (throwableByTimestamp(bucket.min_timestamp, this.renderer.limits, this.renderer.info.app)) continue;
      
      // calculate the x position for the buckets
      let minStamp = prevBucket != null ? prevBucket["min_timestamp"]: bucket.min_timestamp;
      let maxStamp = bucket.max_timesamp;
      let x = this.renderer.getPixelPosition(Math.floor(minStamp + (maxStamp - minStamp)/2));
      
      // check if there is a last bucket force to render
      // else previous bucket to render or to join with current bucket
      if(i <sampleData.length) {
        if(prevBucket == null){
          prevBucket = bucket;
          prevCount += bucket.sample;
          prevX = x;
          continue;
        }

        // check distance from bucket        
        if (prevX == x || Math.abs(prevX-x)<=8) {
          prevCount += bucket.sample        
          continue;
        }
      }
      else {
        let drawLast= true;
        if(prevBucket) {
          if (prevX == x || Math.abs(prevX-x)<=8) {
            prevCount += bucket.sample;
            let prevDot = this.drawDot(y, prevCount, maxHeight, file, x)
            if(dotToConnect)
            {
              this.renderer.connection([dotToConnect,prevDot])              
            }
            dotToConnect = prevDot;
            prevCount=0
            drawLast = false;
          }
          else {
            let prevDot = this.drawDot(y,prevBucket.sample,maxHeight,file,prevX)
            if(dotToConnect)
            {
              this.renderer.connection([dotToConnect,prevDot])             
            }
            dotToConnect = prevDot;
            prevCount=0
          }                    
        }
        if (drawLast){
          let currentDot = this.drawDot(y,bucket.sample,maxHeight,file,x)
            if(dotToConnect)
            {
              this.renderer.connection([dotToConnect,currentDot])
            }
        }
        return;
      }
      
      let count = prevCount + bucket.sample
      // draw a previous dot because we cannot merge with current bucket
      const prevDot = this.drawDot(y, count, maxHeight, file, x)
      if(dotToConnect)
      {
        this.renderer.connection([dotToConnect,prevDot])        
      }
      dotToConnect = prevDot;
      prevBucket = null;
      prevCount = 0;
      prevX = -1;

    }
  }

  private drawDot(y: number, count: number, maxHeight: number, file: Source.Type, x: number) {
    const dotY = y + 47 - Math.floor(((count) / maxHeight) * 47)
    const color = Color.Entity.gradient(file.settings.render_color_palette, count, {
      min: 0,
      max: maxHeight
    })

    this.renderer.ctx.font = '8px Arial'
    this.renderer.ctx.fillStyle = "white"

    this.renderer.ctx.fillText((count).toString(), x - 3.5, dotY - 8)
    const prevDot = { x, y: dotY, color }
    this.renderer.dot(prevDot)
    return prevDot
  }

  render_old(file: Source.Type, y: number, force?: boolean) {
    const sampleData = Source.Entity.samples(this.renderer.info.app, file) ?? []
    
    const graphs = this.getCachedOrGenerate(file)
    const maxHeight = Math.max(...sampleData.map(obj => obj.sample))

    let lastDot: Dot | null = null
    let lastX =  -1
    let lastCount = 0
    let lastBucket: any = null
    sampleData.forEach((bucket) => {
      // check if timestamp is correct and can be rendered
      if (throwableByTimestamp(bucket.min_timestamp, this.renderer.limits, this.renderer.info.app)) return;
      
      // calculate the x position for the buckets
      let minStamp = lastBucket != null ? lastBucket["min_timestamp"]: bucket.min_timestamp;
      let maxStamp = bucket.max_timesamp
      
      let x = this.renderer.getPixelPosition(Math.floor(minStamp + (maxStamp-minStamp)/2));
      if (lastX == x || Math.abs(lastX-x)<=8) {
        lastCount += bucket.sample
        return;
      }
      
      const dotY = y + 47 - Math.floor(((bucket.sample+lastCount)/maxHeight) * 47 )
      const color = Color.Entity.gradient(file.settings.render_color_palette, bucket.sample+lastCount, {
        min: 0,
        max: maxHeight
      })

      this.renderer.ctx.font = '8px Arial'
      this.renderer.ctx.fillStyle = "white"
      if(bucket.sample+lastCount <=0 ) return; 
      
      this.renderer.ctx.fillText((bucket.sample+lastCount).toString(), x - 3.5, dotY - 8)
      
      const currentDot = { x, y: dotY, color }

      if (lastDot) {
        this.renderer.dot(lastDot)
        lastBucket = bucket;
        //this.renderer.connection([currentDot, lastDot])
      }      
      else{
        lastBucket=null;
      }
      lastDot = currentDot      
      lastX = x;
      lastCount = 0;
    })

    // for (const [timestamp, height] of graphs) {
    //   const x = this.renderer.getPixelPosition(timestamp)
    //   if (throwableByTimestamp(timestamp, this.renderer.limits, this.renderer.info.app)) continue;
    //   const dotY = y + 47 - Math.floor((height / maxHeight) * 47)
    //   const color = Color.Entity.gradient(file.settings.render_color_palette, height, {
    //     min: 0,
    //     max: maxHeight
    //   })

    //   this.renderer.ctx.font = '8px Arial'
    //   this.renderer.ctx.fillStyle = color
    //   this.renderer.ctx.fillText(height.toString(), x - 3.5, dotY - 8)

    //   const currentDot = { x, y: dotY, color }

    //   if (lastDot) {
    //     this.renderer.connection([currentDot, lastDot])
    //   }

    //   this.renderer.dot(currentDot)
    //   lastDot = currentDot
    // }
  }

  private getCachedOrGenerate(file: Source.Type): typeof GraphEngine.target {
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

  get(file: Source.Type): typeof GraphEngine.target {
    const heightData = this.renderer.height.get(file)
    const result = new Map() as typeof GraphEngine.target

    const entries = Array.from(heightData.entries())
    let lastRenderedX = -Infinity
    let lastKey: number | undefined = undefined

    for (let i = 0; i < entries.length; i++) {
      const [timestamp, height] = entries[i]
      const x = this.renderer.getPixelPosition(timestamp)

      if (x - lastRenderedX < 8) {
        if (lastKey !== undefined) {
          const prevHeight = result.get(lastKey) || 0
          result.set(lastKey, prevHeight + height)
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
              lastKey = fillTimestamp
              lastRenderedX = fillX
            }
          }
        }
      }

      result.set(timestamp, height)
      lastKey = timestamp
      lastRenderedX = x
    }

    const heights = Array.from(result.values())
    const timestamps = Array.from(result.keys())

    result[Hardcode.Scale] = this.renderer.info.app.timeline.scale
    result[Hardcode.MaxHeight] = Math.max(...heights, 0)
    result[Hardcode.Start] = timestamps[0] ?? 0
    result[Hardcode.End] = timestamps[timestamps.length - 1] ?? 0

    this.map.set(file.id, result)

    return result
  }



  is(file: Source.Type): boolean {
    return this.map.has(file.id)
  }
}