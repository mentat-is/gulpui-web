import { useApplication } from '@/context/Application.context';
import { cn, getDateFormat, getLimits, getTimestamp, throwableByTimestamp } from '@/ui/utils';
import { useEffect, useRef } from 'react';
import s from './styles/TimelineCanvas.module.css';
import { useMagnifier } from '@/dto/useMagnifier';
import { Magnifier } from '@/ui/Magnifier';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { File } from '@/class/Info';
import { StartEnd } from '@/dto/StartEnd.dto';
import { RenderEngine } from '@/class/RenderEngine';
import { format } from 'date-fns';
import { LinksDisplayer } from './Links.displayer';
import { NotesDisplayer } from './Notes.displayer';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { LoggerHandler } from '@/dto/Logger.class';

interface TimelineCanvasProps {
  timeline: React.RefObject<HTMLDivElement>;
  scrollX: number;
  scrollY: number;
  resize: StartEnd;
}

export function TimelineCanvas({ timeline, scrollX, scrollY, resize }: TimelineCanvasProps) {
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  const overlay_ref = useRef<HTMLCanvasElement>(null);
  const wrapper_ref = useRef<HTMLDivElement>(null);
  
  const { app, spawnDialog, Info, dialog } = useApplication();
  const dependencies = [app.target.files, app.target.events.size, scrollX, scrollY, app.target.bucket, app.target.bucket.fetched, app.target.bucket.fetched, app.timeline.scale, app.target.links, dialog, app.timeline.target, app.timeline.loaded, app.timeline.filter];
  const { up, down, move, magnifier_ref, isShiftPressed, mousePosition } = useMagnifier(canvas_ref, dependencies);

  const renderCanvas = (force?: boolean) => {
    if (!canvas_ref.current) return;
    const ctx = canvas_ref.current.getContext('2d')!;
    ctx.clearRect(0, 0, window.innerWidth, canvas_ref.current.height);
    canvas_ref.current.width = window.innerWidth

    const limits = getLimits(app, Info, timeline, scrollX);

    const render = new RenderEngine({ ctx, limits, info: Info, getPixelPosition, scrollX, scrollY })

    render.ruler.draw();
    
    File.selected(app).forEach((file, i) => {
      const y = File.getHeight(app, file, scrollY);

      if (y + 48 < 0 || y > canvas_ref.current!.height - scrollY) return;

      if (!throwableByTimestamp(file.timestamp, limits, app, file.offset)) {
        render[file.engine](file, y - 24, force);
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
    ctx.fillRect(getPixelPosition(app.target.bucket.selected?.min || app.target.bucket.timestamp?.min) - 2, 0, 3, timeline.current?.clientHeight || 0);
    ctx.fillRect(getPixelPosition(app.target.bucket.selected?.max || app.target.bucket.timestamp?.max) + 2, 0, 3, timeline.current?.clientHeight || 0);

    if (timeline.current) {
      render.debug({
        x: timeline.current.clientWidth - 128,
        y: timeline.current.clientHeight - 36
      }, [
        `X: ${scrollX} Y: ${scrollY}`,
        `Scale: ${app.timeline.scale > 1 ? Math.round(app.timeline.scale) : app.timeline.scale.toPrecision(2)}`
      ]);
    }

    render.ruler.sections();
  };

  const handleClick = (event: MouseEvent) => {
    if (event.button === 2)
      return event.preventDefault();

    const { top, left } = canvas_ref.current!.getBoundingClientRect();
    const clickX = event.clientX - left;
    const clickY = event.clientY - top + scrollY;

    const file = File.selected(app)[Math.floor(clickY / 48)];
    const limits = getLimits(app, Info, timeline, scrollX);

    if (!file || throwableByTimestamp(file.timestamp, limits, app, file.offset)) return;

    const clickPosition = Math.round(clickX);

    const events = File.events(app, file).filter(e => {
      const pos = getPixelPosition(e.timestamp + file.offset);

      return clickPosition === Math.round(pos);
    });

    LoggerHandler.canvasClick(file, events, clickPosition);

    if (events.length > 0) {
      spawnDialog(events.length > 1
        ? <DisplayGroupDialog events={events} />
        : <DisplayEventDialog event={events[0]} />)
    }
  };

  useEffect(() => {
    renderCanvas();

    canvas_ref.current?.addEventListener('mousedown', handleClick);
    window.addEventListener('resize', () => renderCanvas());
    const debugInterval = setInterval(() => renderCanvas(true), 300);

    return () => {
      canvas_ref.current?.removeEventListener('mousedown', handleClick);
      window.removeEventListener('resize', () => renderCanvas());
      clearInterval(debugInterval) 
    };
  }, dependencies);

  useEffect(() => {
    renderOverlay();
  }, [resize, mousePosition.x]);

  const renderOverlay = () => {
    if (!overlay_ref.current || !canvas_ref.current) return;
    const overlayCtx = overlay_ref.current.getContext('2d');
    if (!overlayCtx) return;

    overlay_ref.current.height = canvas_ref.current.height || 1;

    overlayCtx.clearRect(0, 0, overlay_ref.current.width, overlay_ref.current.height);
    
    const { start, end } = resize;

    overlayCtx.fillStyle = '#ffffff80';
    overlayCtx.fillRect(start - 1, 0, 3, overlay_ref.current.height);

    if (start === 0 && start === end) return;
    overlayCtx.fillRect(end - 1, 0, 3, overlay_ref.current.height);
  }

  const getPixelPosition = (timestamp: number) => {
    if (!app.target.bucket.selected) return 0;
    return Math.round(((timestamp - app.target.bucket.selected.min) / (app.target.bucket!.selected.max - app.target.bucket!.selected.min)) * Info.width) - scrollX;
  }

  return (
    <div
      ref={wrapper_ref}
      className={cn(s.wrapper)}
      onMouseMove={move}
      onKeyDown={down}
      tabIndex={0}
      onKeyUp={up}>
      <NotesDisplayer getPixelPosition={getPixelPosition} scrollY={scrollY} />
      <LinksDisplayer getPixelPosition={getPixelPosition} scrollY={scrollY} />
      <canvas
        ref={canvas_ref}
        width={window.innerWidth}
        height={timeline.current?.clientHeight}
        />
      <canvas
        className={s.resize}
        ref={overlay_ref} 
        width={window.innerWidth}
        height={timeline.current?.clientHeight} />
      <p style={{ left: mousePosition.x, top: mousePosition.y }} className={s.position}>{format(getTimestamp(scrollX + mousePosition.x, Info), getDateFormat(0))}</p>
      <Magnifier self={magnifier_ref} mousePosition={mousePosition} isVisible={isShiftPressed} />
    </div>
  );
}
