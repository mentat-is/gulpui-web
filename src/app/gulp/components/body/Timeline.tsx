import { useState, useEffect, useRef, MouseEvent, useMemo, useCallback, SetStateAction } from 'react';
import { ContextMenu, ContextMenuTrigger } from '@/ui/ContextMenu';
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';
import { DragDealer } from '@/class/dragDealer.class';
import { Canvas } from './Canvas';
import { StartEnd, StartEndBase } from '@/dto/StartEnd.dto';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { Controls } from './Controls';
import { TargetMenu } from './Target.menu';
import { Input, Stack } from '@impactium/components';
import { FilesMenu } from './Files.manu';
import { useKeyHandler } from '@/app/use';
import { λFile } from '@/dto/Dataset';
import { File } from '@/class/Info';
import { Navigator } from './Navigator';

export function Timeline() {
  const { app, Info, banner, dialog, timeline, spawnDialog } = useApplication();
  const [scrollX, setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(-26);
  const [resize, setResize] = useState<StartEnd>(StartEndBase);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [shifted, setShifted] = useState<λFile[]>([]);
  const [ isShiftPressed ] = useKeyHandler('Shift');

  const increaseScrollY = useCallback((λy: number) => {
    setScrollY((y) => Math.round(y + λy));
  }, [app, timeline]);

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
  }, [timeline]);

  const handleContextMenu = (event: MouseEvent) => {
    const index = Math.floor((event.clientY + scrollY - timeline.current!.getBoundingClientRect().top) / 48)

    const file = File.selected(app)[index];

    if (!file) {
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

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();

    if (app.timeline.target && (key === 'd' || key === 'a')) {
      event.preventDefault();
      const delta = Number(key === 'a') ? 1 : -1;
      Info.setTimelineTarget(delta);
    }
  }, [app.timeline.target, spawnDialog]);

  useEffect(() => {
    if (!timeline.current) {
      return;
    }

    timeline.current.addEventListener('keypress', handleKeyDown);

    return () => {
      timeline.current?.removeEventListener('keypress', handleKeyDown);
    }
  }, [timeline]);

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
    if (shifted.length === 0 ) {
      return null;
    }

    return shifted.length === 1
      ? <TargetMenu file={shifted[0]} inputRef={inputRef} />
      : <FilesMenu files={shifted} inputRef={inputRef} />
  }, [shifted]);

  useEffect(() => {
    Info.refetch();
  }, []);

  return (
    <Stack
      id='timeline'
      className={s.timeline}
      onMouseLeave={handleMouseUpOrLeave}
      onMouseUp={handleMouseUpOrLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      gap={12}
      onContextMenu={handleContextMenu}
      ref={timeline}>
      <ContextMenu>
        <ContextMenuTrigger>
          <Canvas resize={resize} timeline={timeline} scrollX={scrollX} scrollY={scrollY} shifted={shifted} setScrollX={setScrollX} />
          <Input img={null} type='file' accept='.yml' onChange={handleInputChange} ref={inputRef} className={s.upload_sigma_input} />
          <Navigator />
        </ContextMenuTrigger>
        <Menu />
      </ContextMenu>
    </Stack>
  );
}
