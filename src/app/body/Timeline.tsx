import { useEffect, useRef } from 'react'
import s from '../Gulp.module.css'
import { useApplication } from '@/context/Application.context'
import { Canvas } from './Canvas'
import { Navigator } from './Navigator'
import { Algorhithm, getTimestamp } from '@/ui/utils'
import { Stack } from '@/ui/Stack'
import { Source } from '@/entities/Source'
import { MINUTE } from '@/dto'

export function Timeline() {
  const { app, Info, timeline, setScrollX, scrollX, scrollY, setScrollY } = useApplication()
  const scrollRef = useRef({ x: scrollX, y: scrollY });
  
  const focusEvent = (timestamp: number, onLeft = false, file_id?: Source.Id) => {
    const instance = getAlgothitmInstance()

    setScrollX(onLeft ? instance.abs_x_from_timestamp(timestamp) : instance.center_scroll_from_timestamp(timestamp))
    if (file_id) {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement
      if (!canvas) return

      setScrollY(Source.Entity.getHeight(app, file_id, 0) - 26 - canvas.clientHeight / 2)
    }
  }

  useEffect(() => {
    // INITIALIZE AUTOSAVER
    scrollRef.current = { x: scrollX, y: scrollY }

    const autosave = () => {
      Info.session_autosaver?.(scrollRef.current)
    }

    const interval = setInterval(autosave, MINUTE)

    return () => clearInterval(interval)
  }, [Info, scrollX, scrollY])

  const getAlgothitmInstance = () => {
    return new Algorhithm({
      frame: app.timeline.frame,
      scroll: {
        x: scrollX,
        y: scrollY,
      },
      width: Info.width,
      scale: app.timeline.scale,
    })
  }

  // @ts-ignore
  window.focusCanvasOnEvent = focusEvent

  return (
    <Stack
      id="timeline"
      className={s.timeline}
      gap={12}
      flex
      dir="column"
      ref={timeline}
    >
      <Canvas timeline={timeline} />
      <Navigator
        timeline={timeline}
        timestamp={getTimestamp(scrollX + (timeline.current?.clientWidth || 0), Info)}
      />
    </Stack>
  )
}
