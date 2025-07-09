import { useApplication } from '@/context/Application.context'
import { getLimits, getTimestamp, throwableByTimestamp } from '@/ui/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import s from './styles/Canvas.module.css'
import { useMagnifier } from '@/dto/useMagnifier'
import { Magnifier } from '@/ui/Magnifier'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { RenderEngine } from '@/class/RenderEngine'
import { LinksDisplayer } from './Links.displayer'
import { NotesDisplayer } from './Notes.displayer'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { LoggerHandler } from '@/dto/Logger.class'
import { λFile } from '@/dto/Dataset'
import { File, Internal, Note } from '@/class/Info'
import Crosshair from './Crosshair'
import { Stack } from '@impactium/components'
import { debounce } from 'lodash'
import { useDrugs, useKeyHandler } from '@/decorator/use'
import { ContextMenu, ContextMenuTrigger } from '@/ui/ContextMenu'
import { TargetMenu } from './Target.menu'
import { cn } from '@impactium/utils'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Pointers } from '@/components/Pointers'
import { XY } from '@/dto/XY.dto'
import { Highlights } from '@/overlays/Highlights'

export namespace Canvas {
  export interface Props extends Stack.Props {
    timeline: React.RefObject<HTMLDivElement>
  }
}

export function Canvas({ timeline }: Canvas.Props) {
  const canvas_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement);
  const overlay_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement);
  const wrapper_ref = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const { app, banner, spawnDialog, scrollX, scrollY, setScrollX, Info, dialog, highlightsOverlay } = useApplication()
  const [target, setTarget] = useState<λFile | null>(null)
  const { toggler, move, magnifier_ref, isAltPressed, mousePosition } =
    useMagnifier(canvas_ref, [
      app.target.files,
      app.target.events.size,
      scrollX,
      scrollY,
      app.timeline.frame,
      app.timeline.frame,
      app.timeline.scale,
      app.target.links,
      dialog,
      app.timeline.target,
      app.timeline.filter,
      app.timeline.dialogSize,
      app.timeline.hidden_notes,
      target
    ]);
  const { resize, handleMouseDown, handleMouseMove, handleMouseUpOrLeave } = useDrugs(canvas_ref)

  useEffect(() => {
    if (app.timeline.target) {
      spawnDialog(<DisplayEventDialog event={app.timeline.target} />);
    }
  }, []);


  const [isRescaleBlocked, setIsRescaleBlokced] = useState<boolean>(true);
  useEffect(() => {
    setTimeout(() => {
      setIsRescaleBlokced(false);
    }, 250);
  }, []);

  useEffect(() => {
    Note.updateIndexing(app);
  }, [app.target.notes]);

  useEffect(() => {
    RenderEngine.reset('notes');
  }, [app.timeline.scale]);

  const renderCanvas = (
    force?: boolean,
    ctx = canvas_ref.current?.getContext('2d'),
  ) => {
    if (!ctx || !canvas_ref.current) {
      return
    }

    if (wrapper_ref.current && canvas_ref.current.width !== wrapper_ref.current.clientWidth) {
      const oldWidth = canvas_ref.current.width
      const newWidth = wrapper_ref.current.clientWidth

      canvas_ref.current.width = newWidth
      canvas_ref.current.height = wrapper_ref.current.clientHeight

      const delta = oldWidth / newWidth

      if (isRescaleBlocked) {
        return;
      }

      Info.setTimelineScale(app.timeline.scale * delta)
      setScrollX((s) => s - newWidth + oldWidth)
      return
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }

    const limits = getLimits(app, Info, timeline, scrollX)

    const render = new RenderEngine({
      ctx,
      limits,
      info: Info,
      getPixelPosition,
      scrollX,
      scrollY,
    })

    const files = File.selected(app)

    render.ruler.draw()

    Highlights.list().map(v => render.highlight(...v));

    files.forEach((file, i) => {
      const y = File.getHeight(app, file, scrollY)

      if (
        !throwableByTimestamp(file.timestamp, limits, app, file.settings.offset)
      ) {
        render[file.settings.engine].render(file, y - 24, force)
      }

      if (!i) render.primary(file)

      render.lines(file)
      render.locals(file)
      render.draw_info(file)
    })

    render.target()

    render.links()

    if (force || Math.random() < 0.05) {
      RenderEngine.reset('notes');
    }

    if (!app.timeline.hidden_notes) {
      render.notes(files);
    }

    ctx.fillStyle = '#ff000080'
    ctx.fillRect(
      getPixelPosition(app.timeline.frame.min || app.timeline.frame?.min) - 2,
      0,
      3,
      timeline.current?.clientHeight || 0,
    )
    ctx.fillRect(
      getPixelPosition(app.timeline.frame.max || app.timeline.frame?.max) + 2,
      0,
      3,
      timeline.current?.clientHeight || 0,
    )

    render.ruler.sections()

    // @ts-ignore
    window.__UNSUPORTED_FORCE_RENDER_OF_CANVAS__DONT_USE_IT_OR_YOU_WILL_BE_FIRED____λuthor_ℳark = renderCanvas
  }

  const renderOverlay = () => {
    if (!overlay_ref.current || !canvas_ref.current) return
    const overlayCtx = overlay_ref.current.getContext('2d')
    if (!overlayCtx) return

    overlay_ref.current.height = canvas_ref.current.height
    overlay_ref.current.width = canvas_ref.current.width

    overlayCtx.clearRect(
      0,
      0,
      overlay_ref.current.width,
      overlay_ref.current.height,
    )

    overlayCtx.fillStyle = '#ffffff24'
    const start = Math.round(resize.start)
    const end = Math.round(resize.end)

    overlayCtx.fillRect(start, 0, end - start, overlay_ref.current.height)
  }

  useEffect(() => {
    renderOverlay()
  }, [overlay_ref, canvas_ref, resize]);

  // [ ] TODO: Move to Info.tsx;
  const getEventsListFromFileByClickX = (x: number, file: λFile) => {
    const events: λEvent[] = [];

    for (const event of File.events(app, file)) {
      const pos = getPixelPosition(event.timestamp + file.settings.offset)

      if (file.settings.engine === 'graph') {
        if (x >= pos - 16 && x <= pos) {
          events.push(event)
        }
        continue
      }

      if (x === pos) {
        events.push(event)
      }

      if (x > pos) {
        break
      }
    }

    return events;
  }

  const handleClick = (event: MouseEvent) => {
    if (event.button === 2) {
      event.preventDefault();
      return;
    }

    if (!canvas_ref.current) {
      return
    }

    const { top, left } = canvas_ref.current.getBoundingClientRect()
    const click: XY = {
      x: Math.round(event.clientX - left),
      y: Math.round(event.clientY - top + scrollY)
    }

    const index = Math.floor(click.y / 48)

    const file = File.selected(app)[index]

    if (!file) return

    if (click.x < getPixelPosition(file.timestamp.min) || getPixelPosition(file.timestamp.max) < click.x) return

    let events = getEventsListFromFileByClickX(click.x, file);
    if (events.length === 0) {
      events = getEventsListFromFileByClickX(click.x - 1, file);
    }
    if (events.length === 0) {
      events = getEventsListFromFileByClickX(click.x + 1, file);
    }

    LoggerHandler.canvasClick(file, events, click.x)

    if (events.length > 0) {
      spawnDialog(
        events.length > 1 ? (
          <DisplayGroupDialog events={events} />
        ) : (
          <DisplayEventDialog event={events[0]} />
        ),
      )
    }
  }

  // @ts-ignore
  window.xxc = handleClick;

  const [bounding, setBounding] = useState<DOMRect | null>(null)

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!wrapper_ref.current || banner) return

      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        setScrollX((prev) => prev + event.deltaX)
        return
      }

      const rect = bounding || wrapper_ref.current.getBoundingClientRect()
      if (!bounding) setBounding(rect)

      const oldScale = app.timeline.scale
      const cursorX = event.clientX - rect.left
      const contentX = scrollX + cursorX

      let newScale = app.timeline.isScrollReversed
        ? event.deltaY < 0
          ? Info.decreasedTimelineScale()
          : Info.increasedTimelineScale()
        : event.deltaY > 0
          ? Info.decreasedTimelineScale()
          : Info.increasedTimelineScale()

      newScale = Math.max(0.01, Math.min(9999999, newScale))

      if (newScale === oldScale) return

      Info.setTimelineScale(newScale)
      setScrollX(Math.round(contentX * (newScale / oldScale) - cursorX))
    },
    [wrapper_ref, banner, Info, bounding, app.timeline.scale, scrollX],
  )

  const debouncedHandleWheel = useMemo(
    () => debounce(handleWheel, 5),
    [handleWheel],
  )

  useEffect(() => {
    const canvas = wrapper_ref.current
    if (canvas) {
      canvas.addEventListener(
        'wheel',
        debouncedHandleWheel as unknown as EventListener,
        { passive: true },
      )
      canvas.addEventListener('mousemove', move as any, { passive: true })
      canvas.addEventListener('contextmenu', handleContextMenu, {
        passive: true,
      })
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener(
          'wheel',
          debouncedHandleWheel as unknown as EventListener,
        )
        canvas.removeEventListener('mousemove', move as any)
        canvas.removeEventListener('contextmenu', handleContextMenu)
      }
      debouncedHandleWheel.cancel()
    }
  }, [wrapper_ref, debouncedHandleWheel])

  useEffect(() => {
    renderCanvas()

    const debugInterval = setInterval(() => renderCanvas(true), 300)

    return () => {
      clearInterval(debugInterval)
    }
  }, [
    scrollX,
    scrollY,
    app.target.files,
    app.target.notes,
    app.timeline.frame,
    app.timeline.scale,
    app.target.links,
    app.timeline.target,
    app.timeline.filter,
    app.timeline.dialogSize,
    app.timeline.hidden_notes,
    app.target.events.size,
    target
  ])

  const getPixelPosition = useCallback((timestamp: number) => {
    return Math.round(((timestamp - app.timeline.frame.min) / (app.timeline.frame.max - app.timeline.frame.min)) * Info.width) - scrollX
  }, [scrollX, Info.width, app.timeline.frame])

  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (!timeline.current) {
      return
    }

    const index = Math.floor((event.clientY + scrollY - timeline.current.getBoundingClientRect().top) / 48);

    const file = File.selected(app)[index] ?? null;

    setTarget(file);
  }, [setTarget, timeline, scrollY]);

  const Menu = useCallback(() => {
    if (!target) {
      return null
    }

    return <TargetMenu file={target} />
  }, [target])

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={wrapper_ref}
        className={cn(s.wrapper, isAltPressed && s.cursor, s.no_cursor)}
        onMouseLeave={handleMouseUpOrLeave as any}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave as any}
        onKeyDown={toggler}
        tabIndex={0}
      >
        <NotesDisplayer
          getPixelPosition={getPixelPosition}
          self={mousePosition}
        />
        <LinksDisplayer getPixelPosition={getPixelPosition} />
        <Highlights.List.Overlay />
        <canvas
          ref={canvas_ref}
          id="canvas"
          width={wrapper_ref.current?.offsetWidth}
          height={timeline.current?.clientHeight}
        />
        {Internal.Settings.crosshair ? <Crosshair containerRef={wrapper_ref} /> : <Pointers
          getPixelPosition={getPixelPosition}
          width={canvas_ref.current?.clientWidth || 1}
          self={mousePosition}
          timestamp={getTimestamp(scrollX + mousePosition.x, Info)}
        />}
        <canvas className={s.resize} ref={overlay_ref} />
        <Magnifier
          self={magnifier_ref}
          mousePosition={mousePosition}
          isVisible={isAltPressed}
        />
        {highlightsOverlay}
      </ContextMenuTrigger>
      <Menu />
    </ContextMenu>
  )
}
