import { useApplication } from "@/context/Application.context";
import { cn, getLimits, stringToHexColor, throwableByTimestamp } from "@/ui/utils";
import { useEffect, useRef } from "react";
import s from './styles/TimelineCanvas.module.css';
import { useMagnifier } from "@/dto/useMagnifier";
import { Magnifier } from "@/ui/Magnifier";
import { DisplayEventDialog } from "@/dialogs/DisplayEventDialog";
import { File } from "@/class/Info";
import { StartEnd } from "@/dto/StartEnd.dto";
import { Note } from "@/ui/Note";
import { Note as NoteClass } from '@/class/Info';
import { RenderEngine } from "@/class/RenderEngine";
import { DragDealer } from "@/class/dragDealer.class";
import { λFile } from "@/dto/File.dto";
import { format } from "date-fns";

interface TimelineCanvasProps {
  timeline: React.RefObject<HTMLDivElement>;
  scrollX: number;
  scrollY: number;
  resize: StartEnd;
  dragDealer: DragDealer;
}

export const HEIGHT = 48;
export const HALFHEIGHT = HEIGHT / 2;

export function TimelineCanvas({ timeline, scrollX, scrollY, resize, dragDealer }: TimelineCanvasProps) {
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  const overlay_ref = useRef<HTMLCanvasElement>(null);
  const wrapper_ref = useRef<HTMLDivElement>(null);
  const { app, spawnDialog, Info, dialog } = useApplication();
  const dependencies = [app.target.files, app.target.events.size, scrollX, scrollY, app.target.bucket, app.target.bucket.fetched, app.target.bucket.fetched, app.timeline.scale, app.target.links, dialog, app.timeline.target];
  const { up, down, move, magnifier_ref, isShiftPressed, mousePosition } = useMagnifier(canvas_ref, dependencies);

  const renderCanvas = () => {
    if (!canvas_ref.current) return;
    const ctx = canvas_ref.current.getContext("2d")!;
    ctx.clearRect(0, 0, window.innerWidth, canvas_ref.current.height);
    
    ctx.fillStyle = '#ff0000';

    const limits = getLimits(app, Info, timeline, scrollX);

    const render = new RenderEngine({ ctx, limits, app, getPixelPosition, scrollY })
    
    File.selected(app).forEach(file => {
      const y = File.getHeight(app, file, scrollY);

      if (y + HEIGHT < 0 || y > canvas_ref.current!.height + scrollY) return;

      if (!throwableByTimestamp(file.timestamp, limits, file.offset)) {
        render[file.engine](file, y - HALFHEIGHT);
      };

      render.lines(file);
      render.locals(file);
      render.info(file);
    });

    render.target();

    render.links()

    ctx.fillStyle = '#ff000080'
    ctx.fillRect(getPixelPosition(app.target.bucket.selected.min) - 2, 0, 3, timeline.current?.clientHeight || 0);
    ctx.fillRect(getPixelPosition(app.target.bucket.selected.max) + 2, 0, 3, timeline.current?.clientHeight || 0);
  };

  const handleClick = ({ clientX, clientY }: MouseEvent) => {
    const { top, left } = canvas_ref.current!.getBoundingClientRect();
    const clickX = clientX - left;
    const clickY = clientY - top + scrollY;

    const file = File.selected(app)[Math.floor(clickY / 48)];
    const limits = getLimits(app, Info, timeline, scrollX);

    if (!file || throwableByTimestamp(file.timestamp, limits, file.offset)) return;

    File.events(app, file).forEach(event => {
      if (throwableByTimestamp(event.timestamp + file.offset, limits)) return;

      const pos = getPixelPosition(event.timestamp + file.offset);      

      if (Math.round(clickX) === Math.round(pos)) {
        Info.setTimelineTarget(event);
        spawnDialog(<DisplayEventDialog event={event} />);
      }
    });
  };

  useEffect(() => {
    renderCanvas();

    canvas_ref.current?.addEventListener("mousedown", handleClick);
    window.addEventListener('resize', renderCanvas);
    timeline.current?.addEventListener('resize', renderCanvas);

    return () => {
      canvas_ref.current?.removeEventListener("mousedown", handleClick);
      window.removeEventListener('resize', renderCanvas);
      timeline.current?.removeEventListener('resize', renderCanvas);
    };
  }, dependencies);

  useEffect(() => {
    renderOverlay();
  }, [resize]);

  const renderOverlay = () => {
    if (!overlay_ref.current || !canvas_ref.current) return;
    const overlayCtx = overlay_ref.current.getContext("2d");
    if (!overlayCtx) return;

    overlay_ref.current.height = canvas_ref.current.height || 1;

    overlayCtx.clearRect(0, 0, overlay_ref.current.width, overlay_ref.current.height);
    
    const { start, end } = resize;
    if (start === 0 && start === end) return;

    overlayCtx.fillStyle = '#ffffff80';
    overlayCtx.fillRect(start, 0, 3, overlay_ref.current.height);
    overlayCtx.fillRect(end, 0, 3, overlay_ref.current.height);
  }

  const getPixelPosition = (timestamp: number) => Math.round(((timestamp - app.target.bucket!.selected.min) / (app.target.bucket!.selected.max - app.target.bucket!.selected.min)) * Info.width) - scrollX;

  return (
    <>
      <div
        ref={wrapper_ref}
        className={cn(s.wrapper, isShiftPressed && s.shifted)}
        onMouseMove={move}
        onKeyDown={down}
        tabIndex={0}
        onKeyUp={up}>
        <div className={s.notes}>
          {app.target.notes.map(note => {
            const left = getPixelPosition(NoteClass.timestamp(note) + File.find(app, note._uuid)!.offset);
            const top = File.selected(app).findIndex(f => f.name === note.file) * HEIGHT - scrollY - 24;

            return <Note note={note} left={left} top={top} />
          })}
        </div>
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
        <Magnifier isVisible={isShiftPressed} self={magnifier_ref} mousePosition={mousePosition} />
      </div>
    </>
  );
}
