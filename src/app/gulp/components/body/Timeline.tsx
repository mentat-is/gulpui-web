import { useState, useEffect, useRef, MouseEvent, useMemo, useCallback } from 'react';
import { ContextMenu, ContextMenuTrigger } from "@/ui/ContextMenu";
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';
import { DragDealer } from '@/class/dragDealer.class';
import { TimelineCanvas } from './TimelineCanvas';
import { File } from '@/class/Info';
import { StartEnd, StartEndBase } from '@/dto/StartEnd.dto';
import { λFile } from '@/dto/File.dto';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { Controls } from './Controls';
import { TargetMenu } from './Target.menu';
import { Input } from '@/ui/Input';
import { FilesMenu } from './Files.manu';
import { useKeyHandler } from '@/app/use';

export function Timeline() {
  const { app, Info, banner, dialog, timeline, spawnDialog } = useApplication();
  const [scrollX, setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(-26);
  const [resize, setResize] = useState<StartEnd>(StartEndBase);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [bounding, setBounding] = useState<DOMRect | null>(null);
  const [shifted, setShifted] = useState<λFile[]>([]);
  const [ isShiftPressed ] = useKeyHandler('Shift');

  const increaseScrollY = useCallback((λy: number) => {
    setScrollY((y) => Math.round(y + λy));
  }, [app, timeline]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!timeline.current || banner) return;
    
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      setScrollX(scrollX => scrollX + event.deltaX);
      return;
    }

    const width = Info.width;
    const newScale = app.timeline.isScrollReversed
    ? event.deltaY > 0 ? Info.decreasedTimelineScale() : Info.increasedTimelineScale()
    : event.deltaY < 0 ? Info.decreasedTimelineScale() : Info.increasedTimelineScale();

    const rect = bounding || timeline.current.getBoundingClientRect();
    if (!bounding) {
      setBounding(rect);
    }

    const diff = scrollX + event.clientX - rect.left;
    const left = Math.round(diff * (newScale * timeline.current.clientWidth) / width - diff);

    if ((newScale < app.timeline.scale && newScale < 0.01) || (newScale > app.timeline.scale && newScale > 9999999)) return;
    Info.setTimelineScale(newScale);
    setScrollX(scrollX => scrollX + left);
  }, [timeline, banner, Info, bounding, app.timeline.scale, scrollX]);


  /**
   * Используется как лимитер на кол-во срабатываний скролла колёсиком мыши,
   * так как в инном случае, реакт не успевает обовить дом древо,
   * что производит к неправильным расчётам.
   */
  const debouncedHandleWheel = useMemo(() => debounce(handleWheel, 5), [handleWheel]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    dragState.current.dragStart(event);
    if (event.altKey) {
      setResize({ start: event.clientX, end: event.clientX });
      setIsResizing(true);
    }
  }, [setResize]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isResizing) return setResize((prev) => ({ ...prev, end: event.clientX }))
      
    dragState.current.dragMove(event);
    setResize({ start: event.clientX, end: event.clientX });
  }, [isResizing]);

  const handleMouseUpOrLeave = useCallback((event: MouseEvent) => {
    event.preventDefault();
    dragState.current.dragStop();
  
    if (isResizing) {
      const min = Math.min(resize.end, resize.start);
      const max = Math.max(resize.end, resize.start);

      const scale = Info.width / (max - min);
      
      if (scale === Infinity) return toast('Selected frame too small');
  
      Info.setTimelineScale(scale);
      setScrollX((scrollX + min) * (scale / app.timeline.scale));
    }
  
    setResize(StartEndBase);
    setIsResizing(false);
  }, [isResizing, resize, Info, scrollX, app.timeline.scale]);

  const dragState = useRef(new DragDealer({ info: Info, timeline, setScrollX, increaseScrollY }));

  useEffect(() => {
    dragState.current = new DragDealer({ info: Info, timeline, setScrollX, increaseScrollY });
  }, [timeline])

  useEffect(() => {
    if (isResizing) return;

    const handleResize = () => setBounding(null);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [timeline, banner, dialog, app.timeline.scale, isResizing, Info, increaseScrollY]);

  useEffect(() => {
    const currentTimeline = timeline.current;
    if (currentTimeline) {
      currentTimeline.addEventListener('wheel', debouncedHandleWheel as unknown as EventListener, { passive: true });
    }

    return () => {
      if (currentTimeline) {
        currentTimeline.removeEventListener('wheel', debouncedHandleWheel as unknown as EventListener);
      }
      debouncedHandleWheel.cancel();
    };
  }, [timeline, debouncedHandleWheel]);

  const handleContextMenu = (event: MouseEvent) => {
    const index = Math.floor((event.clientY + scrollY - timeline.current!.getBoundingClientRect().top - 64) / 48)

    const file = File.selected(app)[index];

    if (!file) {
      return;
    }

    if (!isShiftPressed) {
      return setShifted([file]);
    }

    if (shifted.find(f => f.uuid === file.uuid)) {
      setShifted(shifted => shifted.filter(f => f.uuid !== file.uuid));
      return
    }
    setShifted(list => [...list, file]);
  }

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();

    if (app.timeline.target && (key === 'd' || key === 'a')) {
      event.preventDefault();
      const delta = Number(key === 'a') ? 1 : -1;
      Info.setTimelineTarget(delta);
    }
  }, [app.timeline.target, spawnDialog]);

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

      await Info.sigma.set(shifted, { name: file.name, content: content as string });

      inputRef.current!.value = '';
    };
    reader.readAsText(file);
  }

  const Menu = useCallback(() => {
    if (shifted.length === 1) {
      return <TargetMenu file={shifted[0]} inputRef={inputRef} />
    }

    return <FilesMenu files={shifted} inputRef={inputRef} />
  }, [shifted]);

  return (
    <div
      id="timeline"
      className={s.timeline}
      onMouseLeave={handleMouseUpOrLeave}
      onMouseUp={handleMouseUpOrLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      onWheel={e => !!e}
      onContextMenu={handleContextMenu}
      ref={timeline}>
      <ContextMenu>
        <ContextMenuTrigger>
          <TimelineCanvas resize={resize} timeline={timeline} scrollX={scrollX} scrollY={scrollY} shifted={shifted} />
          <Controls setScrollX={setScrollX} scrollX={scrollX} />
          <Input img={null} type='file' accept='.yml' onChange={handleInputChange} ref={inputRef} className={s.upload_sigma_input} />
        </ContextMenuTrigger>
        <Menu />
      </ContextMenu>
    </div>
  );
}
