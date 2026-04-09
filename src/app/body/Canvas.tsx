import { Application } from '@/context/Application.context'
import { useScroll, scrollStore } from '@/store/scroll.store'
import { getTimestamp } from '@/ui/utils'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import s from './styles/Canvas.module.css'
import { useMagnifier } from '@/dto/useMagnifier'
import { Magnifier } from '@/ui/Magnifier'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { RenderEngine } from '@/class/RenderEngine'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { debounce } from 'lodash'
import { useDrugs } from '@/decorator/use'
import { ContextMenu, ContextMenuTrigger } from '@/ui/ContextMenu'
import { TargetMenu } from './Target.menu'
import { cn } from '@impactium/utils'
import { XY, XYBase } from '@/dto/XY.dto'
import { Highlights } from '@/overlays/Highlights'
import { Stack } from '@/ui/Stack'
import { Spinner } from '@/ui/Spinner'
import { Source } from '@/entities/Source'
import { Doc } from '@/entities/Doc'
import { Operation } from '@/entities/Operation'
import { useTheme } from 'next-themes'
import { Button } from '@/ui/Button'
import { LayeredTimelineRenderer } from '@/render/timeline/LayeredTimelineRenderer'

export namespace Canvas {
  export interface Props extends Stack.Props {
    timeline: React.RefObject<HTMLDivElement>
  }
}

export function Canvas({ timeline }: Canvas.Props) {
  const { theme } = useTheme()
  const composite_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement)
  const background_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement)
  const events_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement)
  const links_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement)
  const notes_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement)
  const pointers_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement)
  const overlay_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement)
  const wrapper_ref = useRef<HTMLDivElement>(null as unknown as HTMLDivElement)
  const renderer_ref = useRef(LayeredTimelineRenderer.getInstance())
  const { app, banner, spawnDialog, Info, dialog, highlightsOverlay } = Application.use()
  const { x: scrollX, y: scrollY } = useScroll()
  const [target, setTarget] = useState<Source.Type | null>(null)
  const { toggler, move, magnifier_ref, isAltPressed, mousePosition } =
    useMagnifier(composite_ref, [
      app.target.files, app.target.events.size, scrollX, scrollY, app.timeline.frame, app.timeline.scale, app.target.links, dialog, app.timeline.target, app.timeline.filter, app.timeline.dialogSize, app.hidden, target]);
  const { resize, handleMouseDown, handleMouseMove, handleMouseUpOrLeave } = useDrugs(composite_ref)
  const pendingFrame = useRef<number>(0)
  const queuedForceRender = useRef(false)
  const scrollXRef = useRef(scrollX)
  const scrollYRef = useRef(scrollY)
  const pointerPositionRef = useRef<XY>(XYBase(0))

  useEffect(() => {
    scrollXRef.current = scrollX
    scrollYRef.current = scrollY
  }, [scrollX, scrollY])

  useEffect(() => {
    renderer_ref.current.attachLayers({
      composite: composite_ref.current,
      background: background_ref.current,
      events: events_ref.current,
      links: links_ref.current,
      notes: notes_ref.current,
      pointers: pointers_ref.current
    })
  }, [])

  const syncScrollToContext = useMemo(
    () => debounce((x: number, y: number) => {
      scrollStore.setScrollX(x)
      scrollStore.setScrollY(y)
    }, 16), // 60fps circa
    []
  );

  /**
   * LAZY INDEXING: Instead of eagerly rebuilding the note-to-source index here
   * (which ran O(n*m) on every WebSocket note update), we only invalidate.
   * The actual rebuild happens lazily on first access in renderCanvas() via
   * Note.Entity.ensureIndexing(). This eliminates a cascade where this effect
   * and the render effect both triggered on the same `app.target.notes` change.
   */
  useEffect(() => {
    RenderEngine.reset('notes')
    RenderEngine.reset('flags')
  }, [app.target.notes, app.timeline.scale, app.target.files])

  const renderCanvas = useCallback((force = false) => {
    if (!wrapper_ref.current || !composite_ref.current) {
      return
    }

    const width = wrapper_ref.current.clientWidth
    const height = wrapper_ref.current.clientHeight
    if (!width || !height) {
      return
    }

    if (composite_ref.current.width !== width) {
      const oldWidth = composite_ref.current.width || width
      renderer_ref.current.resize(width, height)
      if (oldWidth !== width) {
        const delta = oldWidth / width
        Info.setTimelineScale(Info.app.timeline.scale * delta)
        scrollStore.setScrollX(s => s - width + oldWidth)
        return
      }
    } else {
      renderer_ref.current.resize(width, height)
    }

    if (force) {
      renderer_ref.current.clearAllCaches()
    }

    renderer_ref.current.render({
      app: Info.app,
      width,
      height,
      scale: Info.app.timeline.scale,
      frame: Info.app.timeline.frame,
      scrollX: scrollXRef.current,
      scrollY: scrollYRef.current,
      hover: pointerPositionRef.current,
      pointer: {
        self: pointerPositionRef.current,
        timestamp: getTimestamp(scrollXRef.current + pointerPositionRef.current.x, Info),
        peers: Info.app.timeline.pointers
      },
      highlights: Highlights.list(),
      composeComposite: isAltPressed
    })
  }, [Info, isAltPressed])

  const queueRender = useCallback((force = false) => {
    queuedForceRender.current = queuedForceRender.current || force
    if (pendingFrame.current) {
      return
    }
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = 0
      const shouldForce = queuedForceRender.current
      queuedForceRender.current = false
      renderCanvas(shouldForce)
      renderOverlay()
    })
  }, [renderCanvas])

  const renderOverlay = () => {
    if (!overlay_ref.current || !composite_ref.current) return
    const overlayCtx = overlay_ref.current.getContext('2d')
    if (!overlayCtx) return

    overlay_ref.current.height = composite_ref.current.height
    overlay_ref.current.width = composite_ref.current.width

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
  }, [resize])

  const handleClick = useCallback((event: MouseEvent) => {
    if (event.button === 2) {
      event.preventDefault()
      return
    }

    if (!composite_ref.current) {
      return
    }

    const rect = composite_ref.current.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      return
    }

    const point = {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top)
    }

    const hit = renderer_ref.current.hitTest(Info.app, point)
    if (!hit) {
      return
    }

    if (hit.type === 'link') {
      if (hit.link.doc_ids.length === 1) {
        spawnDialog(<DisplayEventDialog event={Doc.Entity.id(Info.app, hit.link.doc_id_from)} />)
      } else {
        spawnDialog(<DisplayGroupDialog events={hit.link.doc_ids.map(id => Doc.Entity.id(Info.app, id)).filter(Boolean)} />)
      }
      return
    }

    if (hit.type === 'note') {
      if (hit.notes.length === 1) {
        spawnDialog(<DisplayEventDialog event={Doc.Entity.id(Info.app, hit.notes[0].doc._id)} />)
      } else {
        spawnDialog(<DisplayGroupDialog events={hit.notes.map(note => Doc.Entity.id(Info.app, note.doc._id)).filter(Boolean)} />)
      }
      return
    }

    if (hit.events.length === 1) {
      spawnDialog(<DisplayEventDialog event={hit.events[0]} />)
      return
    }

    if (hit.events.length > 1) {
      spawnDialog(<DisplayGroupDialog events={hit.events} />)
    }
  }, [Info, spawnDialog])

  // @ts-ignore
  window.xxc = handleClick

  const [bounding, setBounding] = useState<DOMRect | null>(null)

  // Reset cached bounding rect when files change (e.g. operation switch)
  useEffect(() => {
    setBounding(null);
  }, [app.target.files]);

  // STABLE REFS: Store scrollX and scale in refs so the handleWheel callback
  // doesn't need them as dependencies. Without this, every scroll/zoom tick would
  // recreate handleWheel → recreate debouncedHandleWheel → remove/add the DOM
  // event listener, causing unnecessary overhead on every single wheel event.

  const scaleRef = useRef(app.timeline.scale);
  scaleRef.current = app.timeline.scale;

  /**
   * Handles mouse wheel events for both horizontal scrolling and zoom.
   * - Horizontal scroll: deltaX > deltaY → pan the canvas horizontally.
   * - Zoom: deltaY dominant → adjust timeline scale around cursor position.
   *
   * Uses `scrollXRef` and `scaleRef` instead of direct state to keep the callback
   * stable across renders (deps: only wrapper_ref, banner, Info, bounding).
   * This prevents the debounced listener from being re-attached on every frame.
   */
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!wrapper_ref.current || banner) return

      // Horizontal scroll — pan only, no zoom
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        scrollXRef.current += event.deltaX
        syncScrollToContext(scrollXRef.current, scrollYRef.current)
        queueRender(false)
        return
      }

      // Cache bounding rect to avoid repeated getBoundingClientRect() calls
      const rect = bounding || wrapper_ref.current.getBoundingClientRect()
      if (!bounding) setBounding(rect)

      // Read current values from refs (always up-to-date, no dependency needed)
      const oldScale = scaleRef.current
      const cursorX = event.clientX - rect.left
      const contentX = scrollXRef.current + cursorX

      // Calculate new scale based on scroll direction and user preference
      let newScale = Info.app.timeline.isScrollReversed
        ? event.deltaY < 0
          ? Info.decreasedTimelineScale()
          : Info.increasedTimelineScale()
        : event.deltaY > 0
          ? Info.decreasedTimelineScale()
          : Info.increasedTimelineScale()

      newScale = Math.max(0.01, Math.min(9999999, newScale))

      if (newScale === oldScale) return

      // Update scale and recompute scrollX to keep cursor position anchored
      Info.setTimelineScale(newScale)
      scrollStore.setScrollX(Math.round(contentX * (newScale / oldScale) - cursorX))
    },
    [wrapper_ref, banner, Info, bounding, queueRender],
  )


  /** Debounced wheel handler — coalesces rapid scroll events (5ms window). */
  const debouncedHandleWheel = useMemo(
    () => debounce(handleWheel, 5),
    [handleWheel],
  )

  useEffect(() => {
    const canvas = wrapper_ref.current

    const handleNativeHover = (event: MouseEvent) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      pointerPositionRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
      queueRender(false)
    }

    const resetHover = () => {
      pointerPositionRef.current = XYBase(-1000)
      queueRender(false)
    }

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
      canvas.addEventListener('mousemove', handleNativeHover, { passive: true })
      canvas.addEventListener('mouseleave', resetHover)
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener(
          'wheel',
          debouncedHandleWheel as unknown as EventListener,
        )
        canvas.removeEventListener('mousemove', move as any)
        canvas.removeEventListener('contextmenu', handleContextMenu)
        canvas.removeEventListener('mousemove', handleNativeHover)
        canvas.removeEventListener('mouseleave', resetHover)
      }
      debouncedHandleWheel.cancel()
    }
  }, [wrapper_ref, debouncedHandleWheel, handleContextMenu, move, queueRender])

  useEffect(() => {
    queueRender(true)

    return () => {
      if (pendingFrame.current) {
        cancelAnimationFrame(pendingFrame.current)
        pendingFrame.current = 0
      }
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
    app.timeline.renderVersion,
    app.hidden,
    app.target.events.size,
    target,
    theme,
    queueRender
  ])

  const getPixelPosition = useCallback((timestamp: number) => {
    return Math.round(((timestamp - Info.app.timeline.frame.min) / (Info.app.timeline.frame.max - Info.app.timeline.frame.min)) * Info.width) - scrollXRef.current
  }, [Info])

  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (!timeline.current) {
      return
    }

    const index = Math.floor((event.clientY + scrollYRef.current - timeline.current.getBoundingClientRect().top) / 48);

    const file = Source.Entity.selected(Info.app)[index] ?? null;

    setTarget(file);
  }, [setTarget, timeline, Info.app.timeline.filter, Info.app.target.files]);

  const Menu = useCallback(() => {
    if (!target) {
      return null
    }

    return <TargetMenu source={target} />
  }, [target]);

  const totalHeight = useMemo(() => {
    if (!composite_ref.current) {
      return 1920;
    }
    const files = Source.Entity.selected(app);
    const amount = files.length;

    return (composite_ref.current.height * 2) + (amount * 48) - 80;
  }, [app.target.files, app.timeline.filter]);

  const scrollbar = useRef<HTMLDivElement>(null);
  const isManualScroll = useRef(false);
  const isProgramScroll = useRef(false);

  const scrollBarEventHandler = useCallback((a: React.UIEvent<HTMLDivElement>) => {
    if (isProgramScroll.current) {
      isProgramScroll.current = false;
      return;
    }
    
    const newScrollY = a.currentTarget.scrollTop - (composite_ref.current?.height ?? 0);
    scrollYRef.current = newScrollY;

    syncScrollToContext(scrollXRef.current, newScrollY);
    isManualScroll.current = true;
    queueRender(false)
  }, [queueRender, syncScrollToContext]);

  useLayoutEffect(() => {
    if (isManualScroll.current || !scrollbar.current || !composite_ref.current) {
      isManualScroll.current = false;
      return;
    };

    const newScrollTop = scrollY + (composite_ref.current.height ?? 0);

    scrollbar.current.scroll({
      behavior: 'instant',
      top: newScrollTop,
    });
    isProgramScroll.current = true;
  }, [scrollY]);

  const operation = Operation.Entity.selected(app);
  const flaggedEvents = Doc.Entity.flag.getList(operation?.id);

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
        <Highlights.List.Overlay />
        <canvas className={cn(s.canvas, s.composite)} ref={composite_ref} id="canvas" />
        <canvas className={cn(s.canvas, s.background)} ref={background_ref} />
        <canvas className={cn(s.canvas, s.events)} ref={events_ref} />
        <canvas className={cn(s.canvas, s.links)} ref={links_ref} />
        <canvas className={cn(s.canvas, s.notes)} ref={notes_ref} />
        <canvas className={cn(s.canvas, s.pointers)} ref={pointers_ref} />
        <Stack pos='absolute' className={s.island}>
          {flaggedEvents.size > 0 && operation && <Button className={s.unflag} variant='glass' onClick={() => Doc.Entity.flag.reset(operation.id)} icon='FlagOff'>Unflag all {flaggedEvents.size} documents</Button>}
        </Stack>
        <Spinner size={48} className={s.loading_background} />
        <canvas className={s.resize} ref={overlay_ref} />
        <Magnifier
          self={magnifier_ref}
          mousePosition={mousePosition}
          isVisible={isAltPressed}
        />
        <Stack ref={scrollbar} className={s.scrollbar} pos='absolute' ai='flex-start' jc='flex-start' onScroll={scrollBarEventHandler}>
          <Stack style={{ height: totalHeight }} pos='relative' />
        </Stack>
        {highlightsOverlay}
      </ContextMenuTrigger>
      <Menu />
    </ContextMenu>
  )
}
