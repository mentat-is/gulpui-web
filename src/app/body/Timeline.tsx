import { useEffect, useMemo } from 'react'
import s from '../Gulp.module.css'
import { Application } from '@/context/Application.context'
import { Canvas } from './Canvas'
import { Navigator } from './Navigator'
import { Algorhithm, getTimestamp } from '@/ui/utils'
import { Stack } from '@/ui/Stack'
import { Source } from '@/entities/Source'
import { MINUTE } from '@/dto'
import { Tabular } from './Tabular'

export function Timeline() {
  const { app, Info, timeline, setScrollX, scrollX, scrollY, setScrollY, spawnBanner } = Application.use()

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
    const interval = setInterval(() => {
      Info.session_autosave();
    }, MINUTE);

    return () => {
      clearInterval(interval);
    }
  }, [Info]);

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
