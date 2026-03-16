import { Application } from '@/context/Application.context'
import { getLimits, getTimestamp, throwableByTimestamp } from '@/ui/utils'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import s from './styles/Canvas.module.css'
import { useMagnifier } from '@/dto/useMagnifier'
import { Magnifier } from '@/ui/Magnifier'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { RenderEngine } from '@/class/RenderEngine'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { LoggerHandler } from '@/dto/Logger.class'
import { debounce } from 'lodash'
import { useDrugs } from '@/decorator/use'
import { ContextMenu, ContextMenuTrigger } from '@/ui/ContextMenu'
import { TargetMenu } from './Target.menu'
import { cn } from '@impactium/utils'
import { Pointers } from '@/components/Pointers'
import { XY } from '@/dto/XY.dto'
import { Highlights } from '@/overlays/Highlights'
import { Stack } from '@/ui/Stack'
import { Spinner } from '@/ui/Spinner'
import { Source } from '@/entities/Source'
import { Note } from '@/entities/Note'
import { Doc } from '@/entities/Doc'
import { Operation } from '@/entities/Operation'
import { useTheme } from 'next-themes'
import { Button } from '@/ui/Button'

export namespace Canvas {
  export interface Props extends Stack.Props {
    timeline: React.RefObject<HTMLDivElement>
  }
}

export function Canvas({ timeline }: Canvas.Props) {
  const { theme } = useTheme();
  const canvas_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement);
  const overlay_ref = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement);
  const wrapper_ref = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const { app, banner, spawnDialog, scrollX, scrollY, setScrollX, setScrollY, Info, dialog, highlightsOverlay } = Application.use()
  const [target, setTarget] = useState<Source.Type | null>(null)
  const { toggler, move, magnifier_ref, isAltPressed, mousePosition } =
    useMagnifier(canvas_ref, [
      app.target.files, app.target.events.size, scrollX, scrollY, app.timeline.frame, app.timeline.scale, app.target.links, dialog, app.timeline.target, app.timeline.filter, app.timeline.dialogSize, app.hidden, target]);
  const { resize, handleMouseDown, handleMouseMove, handleMouseUpOrLeave } = useDrugs(canvas_ref)
  const pendingFrame = useRef<number>(0);
  const scrollXRef = useRef(scrollX);
  const scrollYRef = useRef(scrollY);
  const mouseXRef = useRef<number>(-1000);
  const mouseYRef = useRef<number>(-1000);

  useEffect(() => {
    scrollXRef.current = scrollX;
    scrollYRef.current = scrollY;
  }, [scrollX, scrollY]);

  const syncScrollToContext = useMemo(
    () => debounce((x: number, y: number) => {
      setScrollX(x);
      setScrollY(y);
    }, 16), // 60fps circa
    [setScrollX, setScrollY]
  );

  useEffect(() => {
    Note.Entity.updateIndexing(app);
    RenderEngine.reset('notes');
    RenderEngine.reset('flags');
  }, [app.target.notes, app.timeline.scale, app.target.files]);

  const renderCanvas = (
    force?: boolean,
    ctx = canvas_ref.current?.getContext('2d'),
  ) => {
    if (!wrapper_ref.current || !ctx || !canvas_ref.current) {
      return
    }

    const app = Info.app; // Capture current state for this frame

    if (canvas_ref.current.width !== wrapper_ref.current.clientWidth) {
      const oldWidth = canvas_ref.current.width
      const newWidth = wrapper_ref.current.clientWidth

      canvas_ref.current.width = newWidth
      canvas_ref.current.height = wrapper_ref.current.clientHeight

      const delta = oldWidth / newWidth

      Info.setTimelineScale(app.timeline.scale * delta)
      setScrollX((s) => s - newWidth + oldWidth)
      return
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }

    const currentScrollX = scrollXRef.current;
    const currentScrollY = scrollYRef.current;
    const limits = getLimits(app, Info, timeline, currentScrollX);

    // Create or reuse the singleton RenderEngine with current frame parameters.
    // The constructor uses the singleton pattern: if an instance exists, it updates
    // its properties and reuses existing sub-engine instances (via updateRenderer())
    // instead of allocating new ones every frame.
    const render = new RenderEngine({
      ctx,
      limits,
      info: Info,
      getPixelPosition,
      scrollX: currentScrollX,
      scrollY: currentScrollY,
      mouseX: mouseXRef.current,
      mouseY: mouseYRef.current
    })

    const files = Source.Entity.selected(app);

    render.ruler.draw()

    Highlights.list().map(v => render.highlight(...v));

    // Y-AXIS VIEWPORT CULLING: Each source row is 48px tall. With more sources
    // and vertical scrolling, most rows are off-screen. By checking the Y position
    // against the canvas bounds (with 48px buffer for partial visibility), we skip
    // engine rendering, line drawing, local markers, and info labels for invisible rows.
    const canvasHeight = ctx.canvas.height;

    files.forEach((file, i) => {
      const y = Source.Entity.getHeight(app, file, currentScrollY, i)

      if (y < -48 || y > canvasHeight + 48) return;

      if (
        !throwableByTimestamp(file.timestamp, limits, app, file.settings.offset)
      ) {
        render[file.settings.render_engine].render(file, y - 24, force)
      }

      if (!i) render.primary(file)

      render.lines(file)
      render.locals(file)
      render.draw_info(file)
    })

    render.target()

    if (force) {
      RenderEngine.reset('notes');
      RenderEngine.reset('flags');
    }

    render.highlightFlaggedDocuments();

    if (!app.hidden.notes) {
      render.notes(files);
    }

    if (!app.hidden.links) {
      render.links();
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
  const getEventsListFromFileByClickX = (x: number, file: Source.Type) => {
    const events = Source.Entity.events(app, file);
    const result: Doc.Type[] = [];
    if (events.length === 0) return result;
    let left = 0;
    let right = events.length - 1;
    let foundIdx = -1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const pos = getPixelPosition(events[mid].timestamp + file.settings.offset);
      
      const isGraph = file.settings.render_engine === 'graph';
      const isHit = isGraph ? (x >= pos - 16 && x <= pos) : (x === pos);

      if (isHit) {
        foundIdx = mid;
        break;
      } else if (pos < x) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    if (foundIdx !== -1) {
      let i = foundIdx;
      while (i >= 0) {
        const p = getPixelPosition(events[i].timestamp + file.settings.offset);
        if (p === x || (file.settings.render_engine === 'graph' && x >= p - 16 && x <= p)) {
          result.push(events[i]);
          i--;
        } else break;
      }
      i = foundIdx + 1;
      while (i < events.length) {
        const p = getPixelPosition(events[i].timestamp + file.settings.offset);
        if (p === x || (file.settings.render_engine === 'graph' && x >= p - 16 && x <= p)) {
          result.push(events[i]);
          i++;
        } else break;
      }
    }
    return result;
  }

  const handleClick = (event: MouseEvent) => {
    if (event.button === 2) {
      event.preventDefault();
      return;
    }

    if (!canvas_ref.current) {
      return
    }

    const rect = canvas_ref.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      return;
    }

    const { top, left } = canvas_ref.current.getBoundingClientRect()
    
    
    if (RenderEngine.interactiveLinks) {
      const canvasHitX = Math.round(event.clientX - left);
      const canvasHitY = Math.round(event.clientY - top);
      for (const item of RenderEngine.interactiveLinks) {
        if (
          canvasHitX >= item.rect.x && canvasHitX <= item.rect.x + item.rect.w &&
          canvasHitY >= item.rect.y && canvasHitY <= item.rect.y + item.rect.h
        ) {
         
          const link = item.link;
          if (link.doc_ids && link.doc_ids.length > 0) {
            const dialog = link.doc_ids.length === 1 
              ? <DisplayEventDialog event={Doc.Entity.id(Info.app, link.doc_id_from)} />
              : <DisplayGroupDialog events={link.doc_ids.map(id => Doc.Entity.id(Info.app, id))} />;
            
            spawnDialog(dialog);
          }
          return;
        }
      }
    }

    if (RenderEngine.interactiveNotes) {
      const canvasHitX = Math.round(event.clientX - left);
      const canvasHitY = Math.round(event.clientY - top);
      for (const item of RenderEngine.interactiveNotes) {
        if (
          canvasHitX >= item.rect.x && canvasHitX <= item.rect.x + item.rect.w &&
          canvasHitY >= item.rect.y && canvasHitY <= item.rect.y + item.rect.h
        ) {
          
          const dialog = item.notes.length === 1 
            ?<DisplayEventDialog event={Doc.Entity.id(Info.app, item.notes[0].doc._id)} />
            : <DisplayGroupDialog events={item.notes.map(note => Doc.Entity.id(Info.app, note.doc._id))} />
          
          return spawnDialog(dialog);
        }
      }
    }

    const click: XY = {
      x: Math.round(event.clientX - left),
      y: Math.round(event.clientY - top + scrollY)
    }
    const index = Math.floor(click.y / 48)

    const file = Source.Entity.selected(Info.app)[index]

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
        scrollXRef.current += event.deltaX;
        if (!pendingFrame.current) {
          pendingFrame.current = requestAnimationFrame(() => {
            pendingFrame.current = 0;
            renderCanvas(false); 
          });
        }
        syncScrollToContext(scrollXRef.current, scrollYRef.current);
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
      setScrollX(Math.round(contentX * (newScale / oldScale) - cursorX))
    },
    [wrapper_ref, banner, Info, bounding],
  )


  /** Debounced wheel handler — coalesces rapid scroll events (5ms window). */
  const debouncedHandleWheel = useMemo(
    () => debounce(handleWheel, 5),
    [handleWheel],
  )

  useEffect(() => {
    const canvas = wrapper_ref.current
    
    const handleNativeHover = (e: MouseEvent) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseXRef.current = e.clientX - rect.left;
    mouseYRef.current = e.clientY - rect.top;

    if (!pendingFrame.current) {
      pendingFrame.current = requestAnimationFrame(() => {
        pendingFrame.current = 0;
        renderCanvas(false); 
      });
    }};

    const resetHover = () => {
    mouseXRef.current = -1000;
    mouseYRef.current = -1000;
    if (!pendingFrame.current) {
      pendingFrame.current = requestAnimationFrame(() => {
        pendingFrame.current = 0;
        renderCanvas(false); 
      });
    }};

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
  }, [wrapper_ref, debouncedHandleWheel])

  useEffect(() => {
    if (pendingFrame.current) {
      cancelAnimationFrame(pendingFrame.current);
    }
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = 0;
      renderCanvas();
    });

    return () => {
      if (pendingFrame.current) {
        cancelAnimationFrame(pendingFrame.current);
        pendingFrame.current = 0;
      }
    };
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
    theme
  ])

  const getPixelPosition = useCallback((timestamp: number) => {
    return Math.round(((timestamp - Info.app.timeline.frame.min) / (Info.app.timeline.frame.max - Info.app.timeline.frame.min)) * Info.width) - scrollXRef.current
  }, [scrollXRef.current, Info.width, Info.app.timeline.frame])

  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (!timeline.current) {
      return
    }

    const index = Math.floor((event.clientY + scrollYRef.current - timeline.current.getBoundingClientRect().top) / 48);

    const file = Source.Entity.selected(Info.app)[index] ?? null;

    setTarget(file);
  }, [setTarget, timeline, Info.app.timeline.filter, ...Info.app.target.files]);

  const Menu = useCallback(() => {
    if (!target) {
      return null
    }

    return <TargetMenu source={target} />
  }, [target]);

  const totalHeight = useMemo(() => {
    if (!canvas_ref.current) {
      return 1920;
    }
    const files = Source.Entity.selected(app);
    const amount = files.length;

    return (canvas_ref.current.height * 2) + (amount * 48) - 80;
  }, [app.target.files, app.timeline.filter, canvas_ref]);

  const scrollbar = useRef<HTMLDivElement>(null);
  const isManualScroll = useRef(false);
  const isProgramScroll = useRef(false);

  const scrollBarEventHandler = useCallback((a: React.UIEvent<HTMLDivElement>) => {
    if (isProgramScroll.current) {
      isProgramScroll.current = false;
      return;
    }
    
    const newScrollY = a.currentTarget.scrollTop - (canvas_ref.current?.height ?? 0);
    scrollYRef.current = newScrollY;

    if (!pendingFrame.current) {
      pendingFrame.current = requestAnimationFrame(() => {
        pendingFrame.current = 0;
        renderCanvas(false); 
      });
    }

    syncScrollToContext(scrollXRef.current, newScrollY);
    isManualScroll.current = true;
  }, [canvas_ref, syncScrollToContext, renderCanvas]);

  useLayoutEffect(() => {
    if (isManualScroll.current || !scrollbar.current || !canvas_ref.current) {
      isManualScroll.current = false;
      return;
    };

    const newScrollTop = scrollY + (canvas_ref.current.height ?? 0);

    scrollbar.current.scroll({
      behavior: 'instant',
      top: newScrollTop,
    });
    isProgramScroll.current = true;
  }, [scrollY, canvas_ref]);

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
        <canvas
          className={s.canvas}
          ref={canvas_ref}
          id="canvas"
        />
        <Stack pos='absolute' className={s.island}>
          {flaggedEvents.size > 0 && operation && <Button className={s.unflag} variant='glass' onClick={() => Doc.Entity.flag.reset(operation.id)} icon='FlagOff'>Unflag all {flaggedEvents.size} documents</Button>}
        </Stack>
        <Spinner size={48} className={s.loading_background} />
        <Pointers
          getPixelPosition={getPixelPosition}
          width={canvas_ref.current?.clientWidth || 1}
          self={mousePosition}
          timestamp={getTimestamp(scrollX + mousePosition.x, Info)}
        />
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
