import { useApplication } from '@/context/Application.context';
import { getLimits, getTimestamp, throwableByTimestamp } from '@/ui/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './styles/Canvas.module.css';
import { useMagnifier } from '@/dto/useMagnifier';
import { Magnifier } from '@/ui/Magnifier';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { StartEnd } from '@/dto/StartEnd.dto';
import { RenderEngine } from '@/class/RenderEngine';
import { LinksDisplayer } from './Links.displayer';
import { NotesDisplayer } from './Notes.displayer';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { LoggerHandler } from '@/dto/Logger.class';
import { Timestamp } from '@/ui/timestamp';
import { λFile } from '@/dto/Dataset';
import { File } from '@/class/Info';
import Crosshair from './Crosshair';
import { Controls } from './Controls';
import { SetState } from '@/class/API';
import { Stack } from '@impactium/components';
import { debounce } from 'lodash';

export namespace Canvas {
  export interface Props extends Stack.Props {
    timeline: React.RefObject<HTMLDivElement>;
    shifted: λFile[];
    setScrollX: SetState<number>;
    scrollX: number;
    scrollY: number;
    resize: StartEnd;  
  }
}

export function Canvas({ timeline, setScrollX, scrollX, scrollY, resize, shifted }: Canvas.Props) {
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  const overlay_ref = useRef<HTMLCanvasElement>(null);
  const wrapper_ref = useRef<HTMLDivElement>(null);
  
  const { app, banner, spawnDialog, Info, dialog } = useApplication();
  const dependencies = [app.target.files, app.target.events.size, scrollX, scrollY, app.timeline.frame, app.timeline.frame, app.timeline.scale, app.target.links, dialog, app.timeline.target, app.timeline.loaded, app.timeline.filter, shifted];
  const { toggler, move, magnifier_ref, isAltPressed, mousePosition } = useMagnifier(canvas_ref, dependencies);

  const renderCanvas = (force?: boolean) => {
    if (!canvas_ref.current) return;
    const ctx = canvas_ref.current.getContext('2d')!;
    ctx.clearRect(0, 0, window.innerWidth, canvas_ref.current.height);
    canvas_ref.current.width = wrapper_ref.current?.clientWidth || (window.innerWidth - 24);
    canvas_ref.current.height = wrapper_ref.current?.clientHeight || (window.innerHeight - 24);

    const limits = getLimits(app, Info, timeline, scrollX);

    const render = new RenderEngine({ ctx, limits, info: Info, getPixelPosition, scrollX, scrollY, shifted })

    render.ruler.draw();
    
    File.selected(app).forEach((file, i) => {
      const y = File.getHeight(app, file, scrollY);

      if (!throwableByTimestamp(file.timestamp, limits, app, file.settings.offset)) {
        render[file.settings.engine].render(file, y - 24, force);
      };

      if (!i)
        render.primary(file);

      render.lines(file);
      render.locals(file);
      render.draw_info(file);
    });

    render.target();

    render.links();

    ctx.fillStyle = '#ff000080'
    ctx.fillRect(getPixelPosition(app.timeline.frame.min || app.timeline.frame?.min) - 2, 0, 3, timeline.current?.clientHeight || 0);
    ctx.fillRect(getPixelPosition(app.timeline.frame.max || app.timeline.frame?.max) + 2, 0, 3, timeline.current?.clientHeight || 0);

    render.ruler.sections();
  };

  const handleClick = (event: MouseEvent) => {
    if (event.button === 2)
      return event.preventDefault();

    const { top, left } = canvas_ref.current!.getBoundingClientRect();
    const clickX = event.clientX - left;
    const clickY = event.clientY - top + scrollY;

    const index = Math.floor(clickY / 48);

    const file = File.selected(app)[index];

    if (!file) return;

    const clickPosition = Math.round(clickX);

    const events = File.events(app, file).filter(e => {
      const pos = getPixelPosition(e.timestamp + file.settings.offset);

      return clickPosition === Math.round(pos);
    });

    LoggerHandler.canvasClick(file, events, clickPosition);

    if (events.length > 0) {
      spawnDialog(events.length > 1
        ? <DisplayGroupDialog events={events} />
        : <DisplayEventDialog event={events[0]} />)
    }
  };

  const [bounding, setBounding] = useState<DOMRect | null>(null);
  
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!wrapper_ref.current || banner) return;
  
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      setScrollX(prev => prev + event.deltaX);
      return;
    }
  
    const rect = bounding || wrapper_ref.current.getBoundingClientRect();
    if (!bounding) setBounding(rect);
  
    const oldScale = app.timeline.scale;
    const cursorX = event.clientX - rect.left;
    const contentX = scrollX + cursorX;
  
    let newScale = app.timeline.isScrollReversed
      ? event.deltaY < 0 ? Info.decreasedTimelineScale() : Info.increasedTimelineScale()
      : event.deltaY > 0 ? Info.decreasedTimelineScale() : Info.increasedTimelineScale();
  
    newScale = Math.max(0.01, Math.min(9999999, newScale));
  
    if (newScale === oldScale) return;
  
    Info.setTimelineScale(newScale);
    setScrollX(contentX * (newScale / oldScale) - cursorX);
  }, [wrapper_ref, banner, Info, bounding, app.timeline.scale, scrollX]);
  

  /**
   * Используется как лимитер на кол-во срабатываний скролла колёсиком мыши,
   * так как в инном случае, реакт не успевает обовить дом древо,
   * что производит к неправильным расчётам.
   */
  const debouncedHandleWheel = useMemo(() => debounce(handleWheel, 5), [handleWheel]);

  useEffect(() => {
    const canvas = wrapper_ref.current;
    if (canvas) {
      canvas.addEventListener('wheel', debouncedHandleWheel as unknown as EventListener, { passive: true });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', debouncedHandleWheel as unknown as EventListener);
      }
      debouncedHandleWheel.cancel();
    };
  }, [wrapper_ref, debouncedHandleWheel]);

  useEffect(() => {
    renderCanvas();

    canvas_ref.current?.addEventListener('mousedown', handleClick);
    const debugInterval = setInterval(() => renderCanvas(true), 300);

    return () => {
      canvas_ref.current?.removeEventListener('mousedown', handleClick);
      clearInterval(debugInterval) 
    };
  }, dependencies);

  const [lastWidth, setLastWidth] = useState<number>(wrapper_ref.current?.clientWidth ?? 1);

  useEffect(() => {
    const wrapper = wrapper_ref.current;
    const target = app.timeline.target;

    if (!wrapper || !target) {
      return;
    }

    console.log(new Date(target.nanotimestamp).valueOf());

    const x = getPixelPosition(new Date(target.nanotimestamp).valueOf());

    console.log(x);
    console.log(wrapper.clientWidth);

    setScrollX(x - wrapper.clientWidth);
  }, [app.timeline.target]);

  const getPixelPosition = (timestamp: number) => Math.round(((timestamp - app.timeline.frame.min) / (app.timeline.frame.max - app.timeline.frame.min)) * Info.width) - scrollX

  return (
    <div
      ref={wrapper_ref}
      className={s.wrapper}
      onMouseMove={move}
      onKeyDown={toggler}
      tabIndex={0}>
      <NotesDisplayer getPixelPosition={getPixelPosition} scrollY={scrollY} />
      <LinksDisplayer getPixelPosition={getPixelPosition} scrollY={scrollY} />
      <Controls setScrollX={setScrollX} scrollX={scrollX} />
      <canvas
        ref={canvas_ref}
        id='canvas'
        height={timeline.current?.clientHeight}
        />
      <Crosshair containerRef={wrapper_ref} />
      <canvas
        className={s.resize}
        ref={overlay_ref} 
        height={timeline.current?.clientHeight} />
      <Timestamp style={{ left: mousePosition.x, top: mousePosition.y }} className={s.position} value={getTimestamp(scrollX + mousePosition.x, Info)} />
      <Magnifier self={magnifier_ref} mousePosition={mousePosition} isVisible={isAltPressed} />
    </div>
  );
}
