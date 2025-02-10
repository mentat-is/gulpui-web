import { useApplication } from '@/context/Application.context';
import { Algorhithm, getLimits, getTimestamp, throwableByTimestamp } from '@/ui/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './styles/Canvas.module.css';
import { useMagnifier } from '@/dto/useMagnifier';
import { Magnifier } from '@/ui/Magnifier';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { RenderEngine } from '@/class/RenderEngine';
import { LinksDisplayer } from './Links.displayer';
import { NotesDisplayer } from './Notes.displayer';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { LoggerHandler } from '@/dto/Logger.class';
import { Timestamp } from '@/ui/timestamp';
import { λFile } from '@/dto/Dataset';
import { File } from '@/class/Info';
import Crosshair from './Crosshair';
import { SetState } from '@/class/API';
import { Input, Stack } from '@impactium/components';
import { debounce } from 'lodash';
import { useDrugs, useKeyHandler } from '@/app/use';
import { Icon } from '@impactium/icons';
import { ContextMenu, ContextMenuTrigger } from '@/ui/ContextMenu';
import { FilesMenu } from './Files.manu';
import { TargetMenu } from './Target.menu';
import { toast } from 'sonner';

export namespace Canvas {
  export interface Props extends Stack.Props {
    timeline: React.RefObject<HTMLDivElement>;
    scrollX: number;
    setScrollX: SetState<number>;
    scrollY: number;
    setScrollY: SetState<number>;
  }
}

export function Canvas({ timeline, scrollX, setScrollX, scrollY, setScrollY }: Canvas.Props) {
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  const overlay_ref = useRef<HTMLCanvasElement>(null);
  const wrapper_ref = useRef<HTMLDivElement>(null);
  
  const { app, banner, spawnDialog, Info, dialog } = useApplication();
  const [shifted, setShifted] = useState<λFile[]>([]);
  const [ isShiftPressed ] = useKeyHandler('Shift');
  const dependencies = [app.target.files, app.target.events.size, scrollX, scrollY, app.timeline.frame, app.timeline.frame, app.timeline.scale, app.target.links, dialog, app.timeline.target, app.timeline.loaded, app.timeline.filter, shifted, app.timeline.dialogSize, app.timeline.footerSize];
  const { toggler, move, magnifier_ref, isAltPressed, mousePosition } = useMagnifier(canvas_ref, dependencies);
  const { resize, handleMouseDown, handleMouseMove, handleMouseUpOrLeave } = useDrugs({
    Info,
    timeline: canvas_ref,
    setScrollX,
    setScrollY,
  });

  const renderCanvas = (force?: boolean, ctx = canvas_ref.current?.getContext('2d')) => {
    if (!ctx || !canvas_ref.current) {
      return;
    }

    if (wrapper_ref.current && canvas_ref.current.width !== wrapper_ref.current.clientWidth) {
      const oldWidth = canvas_ref.current.width;
      const newWidth = wrapper_ref.current.clientWidth

      canvas_ref.current.width = newWidth;
      canvas_ref.current.height = wrapper_ref.current.clientHeight;

      const delta = oldWidth / newWidth;

      Info.setTimelineScale(app.timeline.scale * delta);
      setScrollX(s => s - newWidth + oldWidth);
      return
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

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

    // @ts-ignore
    window.__UNSUPORTED_FORCE_RENDER_OF_CANVAS__DONT_USE_IT_OR_YOU_WILL_BE_FIRED____λuthor_ℳark = renderCanvas;
  };

  const renderOverlay = () => {
    if (!overlay_ref.current || !canvas_ref.current) return;
    const overlayCtx = overlay_ref.current.getContext('2d');
    if (!overlayCtx) return;

    overlay_ref.current.height = canvas_ref.current.height;
    overlay_ref.current.width = canvas_ref.current.width;

    overlayCtx.clearRect(0, 0, overlay_ref.current.width, overlay_ref.current.height);
    
    overlayCtx.fillStyle = '#ffffff24';
    const start = Math.round(resize.start);
    const end = Math.round(resize.end);

    overlayCtx.fillRect(start, 0, end - start, overlay_ref.current.height);
  }

  useEffect(() => {
    renderOverlay();
  }, [overlay_ref, canvas_ref, resize]);

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

      if (file.settings.engine === 'graph') {
        return clickPosition >= pos - 16 && clickPosition <= pos;
      }

      return clickPosition === pos;
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
    setScrollX(Math.round(contentX * (newScale / oldScale) - cursorX));
  }, [wrapper_ref, banner, Info, bounding, app.timeline.scale, scrollX]);

  const debouncedHandleWheel = useMemo(() => debounce(handleWheel, 5), [handleWheel]);

  useEffect(() => {
    const canvas = wrapper_ref.current;
    if (canvas) {
      canvas.addEventListener('wheel', debouncedHandleWheel as unknown as EventListener, { passive: true });
      canvas.addEventListener('mousemove', move as any, { passive: true });
      canvas.addEventListener('contextmenu', handleContextMenu, { passive: true });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', debouncedHandleWheel as unknown as EventListener);
        canvas.removeEventListener('mousemove', move as any);
        canvas.removeEventListener('contextmenu', handleContextMenu);
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

  useEffect(() => {
    if (dialog) {
      return;
    }
    spawnDialog(<DisplayGroupDialog events={[]} />);
  }, [app.target.events]);

  const getPixelPosition = (timestamp: number) => Math.round(((timestamp - app.timeline.frame.min) / (app.timeline.frame.max - app.timeline.frame.min)) * Info.width) - scrollX

  const handleContextMenu = (event: MouseEvent) => {
    const index = Math.floor((event.clientY + scrollY - timeline.current!.getBoundingClientRect().top) / 48)

    const file = File.selected(app)[index];

    if (!file) {
      if (!isShiftPressed) {
        setShifted([]);
      }
      return;
    }

    if (!isShiftPressed) {
      return setShifted([file]);
    }

    if (shifted.find(f => f.id === file.id)) {
      setShifted(shifted => shifted.filter(f => f.id !== file.id));
      return
    }
    setShifted(list => [...list, file]);
  }

  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = () => {
    if (shifted.length === 0) return

    const file = inputRef.current?.files?.[0];
    if (!file) return toast('No sigma rule selected', {
      description: 'Please select a file with a sigma rule in YML format'
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;

      // await Info.sigma.set(shifted, { name: file.name, content: content as string });

      inputRef.current!.value = '';
    };
    reader.readAsText(file);
  }


  const Menu = useCallback(() => {
    if (shifted.length === 0 ) {
      return null;
    }

    return shifted.length === 1
      ? <TargetMenu file={shifted[0]} inputRef={inputRef} />
      : <FilesMenu files={shifted} inputRef={inputRef} />
  }, [shifted]);

  

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={wrapper_ref}
        className={s.wrapper}
        onMouseLeave={handleMouseUpOrLeave as any}
        onMouseUp={handleMouseUpOrLeave as any}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onKeyDown={toggler}
        tabIndex={0}>
        <NotesDisplayer getPixelPosition={getPixelPosition} scrollY={scrollY} />
        <LinksDisplayer getPixelPosition={getPixelPosition} scrollY={scrollY} />
        <canvas
          ref={canvas_ref}
          id='canvas'
          height={timeline.current?.clientHeight}
          />
        <Crosshair containerRef={wrapper_ref} />
        <canvas
          className={s.resize}
          ref={overlay_ref} />
        <Timestamp style={{ left: mousePosition.x, top: mousePosition.y }} className={s.position} value={getTimestamp(scrollX + mousePosition.x, Info)} />
        <Magnifier self={magnifier_ref} mousePosition={mousePosition} isVisible={isAltPressed} />
        <Input img={null} type='file' accept='.yml' onChange={handleInputChange} ref={inputRef} className={s.upload_sigma_input} />
      </ContextMenuTrigger>
      <Menu />
    </ContextMenu>
  );
}
