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

interface TimelineCanvasProps {
  timeline: React.RefObject<HTMLDivElement>;
  scrollX: number;
  scrollY: number;
  resize: StartEnd;
}

const HEIGHT = 48;

export function TimelineCanvas({ timeline, scrollX, scrollY, resize }: TimelineCanvasProps) {
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  const overlay_ref = useRef<HTMLCanvasElement>(null);
  const wrapper_ref = useRef<HTMLDivElement>(null);
  const { app, spawnDialog, Info, dialog } = useApplication();
  const dependencies = [app.target.files, app.target.events.size, scrollX, scrollY, app.target.bucket, app.target.bucket.fetched, app.target.bucket.fetched, app.timeline.scale, app.target.links, dialog, app.timeline.target];
  const { up, down, move, magnifier_ref, isShiftPressed, mousePosition } = useMagnifier(canvas_ref, dependencies);

  const renderCanvas = () => {
    const canvas = canvas_ref.current
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, window.innerWidth, canvas.height);
    
    ctx.fillStyle = '#ff0000';

    const limits = getLimits(app, Info, timeline, scrollX);

    const render = new RenderEngine({ ctx, limits, app, getPixelPosition })
    
    File.selected(app).forEach((file, index) => {
      const y = index * HEIGHT - scrollY;

      if (y + 47 < 0 || y > canvas.height + scrollY) return;

      ctx.fillStyle = stringToHexColor(File.context(app, file).name) + '48';
      ctx.fillRect(0, y + 47, window.innerWidth, 1);

      if (!throwableByTimestamp(file.timestamp, limits, file.offset)) {
        render[file.engine](file, y);
      };

      ctx.font = `12px Arial`;
      ctx.fillStyle = '#e8e8e8';
      ctx.fillText(file.name, 10, y + 26);
      
      ctx.font = `10px Arial`;
      ctx.fillStyle = '#a1a1a1';
      ctx.fillText(`${file.doc_count.toString()} | ${File.context(app, file).name}`, 10, y + 14);
      
      ctx.fillStyle = '#e8e8e8';
      ctx.fillText(File.events(app, file).length.toString(), 10, y + 38);
    });

    if (app.timeline.target) {
      const file = File.find(app, app.timeline.target._uuid);

      if (!file || throwableByTimestamp(app.timeline.target.timestamp, limits, file.offset)) return;

      ctx.fillStyle = app.timeline.target._id
      ctx.fillRect(0, File.selected(app).findIndex(f => f.uuid === file.uuid) * 48 + 23 - scrollY, timeline.current!.clientWidth, 1)
      ctx.fillRect(getPixelPosition(app.timeline.target.timestamp + file.offset), 0, 1, timeline.current!.clientHeight)
    }

    app.target.links.forEach(l => {
      const dots: ({ x: number; y: number; color: string; })[] = l.events.map(e => {
        const i = File.selected(app).findIndex(f => f.uuid === e._uuid);

        const file = File.selected(app)[i]

        return {
          x: getPixelPosition(e.timestamp + file.offset || 0),
          y: i * 48,
          color: stringToHexColor(file.name.toString() || '')
        }
      });
      
      dots.forEach(({ color, x, y }) => {
        ctx.fillStyle = color;
        ctx.roundRect(x, y, 10, 10);
      })
    });
  };

  const handleClick = ({ clientX, clientY }: MouseEvent) => {
    const { top, left } = canvas_ref.current!.getBoundingClientRect();
    const clickX = clientX - left;
    const clickY = clientY - top + scrollY;

    const file = File.selected(app)[Math.floor(clickY / 48)];

    if (!file) return;

    const limits = getLimits(app, Info, timeline, scrollX);

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

    canvas_ref.current?.addEventListener("click", handleClick);
    window.addEventListener('resize', renderCanvas);
    timeline.current?.addEventListener('resize', renderCanvas);

    return () => {
      canvas_ref.current?.removeEventListener("click", handleClick);
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
            const top = File.selected(app).findIndex(f => f.name === note.file) * HEIGHT - scrollY;

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
