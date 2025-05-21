import { useState, useEffect } from 'react'
import s from '../Gulp.module.css'
import { useApplication } from '@/context/Application.context'
import { Canvas } from './Canvas'
import { Stack } from '@impactium/components'
import { Navigator } from './Navigator'
import { Algorhithm, getTimestamp } from '@/ui/utils'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { File } from '@/class/Info'
import { λFile } from '@/dto/Dataset'

export function Timeline() {
  const { app, Info, timeline, setScrollX, scrollX, scrollY, setScrollY } = useApplication()

  useEffect(() => {
    Info.refetch()
  }, [])

  const focusEvent = (timestamp: number, onLeft = false, file_id?: λFile['id']) => {
    const instanse = getAlgothitmInstance()

    setScrollX(onLeft ? instanse.abs_x_from_timestamp(timestamp) : instanse.center_scroll_from_timestamp(timestamp))
    if (file_id) {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      if (!canvas) return

      setScrollY(File.getHeight(app, file_id, 0) - 26 - canvas.clientHeight / 2);
    }
  }

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
        timestamp={getTimestamp(
          scrollX + (timeline.current?.clientWidth || 0),
          Info,
        )}
      />
    </Stack>
  )
}
