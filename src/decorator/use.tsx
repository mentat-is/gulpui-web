import { DragDealer } from '@/class/dragDealer.class'
import { useApplication } from '@/context/Application.context'
import { StartEnd, StartEndBase } from '@/dto/StartEnd.dto'
import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export function useKeyHandler(key: string) {
  const [isKeyPressed, setIsKeyPressed] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === key) {
        setIsKeyPressed(true)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === key) {
        setIsKeyPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [key])

  return [isKeyPressed]
}

export const useDrugs = (timeline: RefObject<HTMLCanvasElement>) => {
  const { app, Info, setScrollX, scrollX, setScrollY, highlightsOverlay } = useApplication()
  const [resize, setResize] = useState<StartEnd>(StartEndBase)
  const [isResizing, setIsResizing] = useState(false)

  const increaseScrollY = (newY: number) => {
    setScrollY((y) => Math.round(y + newY))
  }

  const dragState = useRef(
    new DragDealer({ info: Info, timeline, increaseScrollY, setScrollX }),
  )

  useEffect(() => {
    dragState.current = new DragDealer({
      info: Info,
      timeline,
      increaseScrollY,
      setScrollX
    })
  }, [timeline])

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (highlightsOverlay) {
      return;
    }

    dragState.current.clicked = true;
    dragState.current.dragStart(event)
    const rect = timeline.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    if (event.altKey) {
      setResize({ start: event.clientX - rect.x, end: event.clientX - rect.x })
      setIsResizing(true)
    }
  }, [highlightsOverlay, dragState])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = timeline.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    if (isResizing) {
      setResize((prev) => ({ ...prev, end: event.clientX - rect.x }))
      return
    }

    dragState.current.dragMove(event)
  }, [isResizing, highlightsOverlay, dragState])

  const handleMouseUpOrLeave = useCallback((event: MouseEvent) => {
    if (dragState.current.dragging === true) {
      dragState.current.dragging = false;
      dragState.current.clicked = false;
    } else {
      // @ts-ignore
      window.xxc(event);
    }

    event.preventDefault()
    dragState.current.dragStop()

    if (isResizing) {
      const min = Math.min(resize.end, resize.start)
      const max = Math.max(resize.end, resize.start)
      const scale =
        (document.getElementById('canvas')!.clientWidth *
          Info.app.timeline.scale) /
        (max - min)

      if (!isFinite(scale)) return toast('Selected frame too small')

      setScrollX(x => (x + min) * (scale / Info.app.timeline.scale))
      setTimeout(() => {
        Info.setTimelineScale(scale)
      }, 10)
    }

    setResize(StartEndBase)
    setIsResizing(false)
  }, [dragState, isResizing, resize, Info.app.timeline.scale]);

  return {
    dragState,
    resize,
    isResizing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
  }
}
