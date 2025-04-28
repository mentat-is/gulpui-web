import { useState, useEffect } from 'react'
import s from '../Gulp.module.css'
import { useApplication } from '@/context/Application.context'
import { Canvas } from './Canvas'
import { Stack } from '@impactium/components'
import { Navigator } from './Navigator'
import { Algorhithm, getTimestamp } from '@/ui/utils'

export function Timeline() {
  const { app, Info, timeline, setScrollX, scrollX, scrollY } = useApplication()

  useEffect(() => {
    Info.refetch()
  }, [])

  const focusTimestamp = (timestamp: number, onLeft = false) => {
    const instanse = getAlgothitmInstance()

    setScrollX(onLeft ? instanse.abs_x_from_timestamp(timestamp) : instanse.center_scroll_from_timestamp(timestamp))
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
  window.focusCanvasOnTimestamp = focusTimestamp

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
