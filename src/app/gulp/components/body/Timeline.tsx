import { useState, useEffect, useRef, MouseEvent, useCallback } from 'react';
import { ContextMenu, ContextMenuTrigger } from '@/ui/ContextMenu';
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';
import { Canvas } from './Canvas';
import { toast } from 'sonner';
import { TargetMenu } from './Target.menu';
import { Input, Stack } from '@impactium/components';
import { FilesMenu } from './Files.manu';
import { useKeyHandler } from '@/app/use';
import { λFile } from '@/dto/Dataset';
import { File, Info } from '@/class/Info';
import { Navigator } from './Navigator';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';

export function Timeline() {
  const { app, Info, timeline, spawnDialog } = useApplication();
  const [scrollX, setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(-26);
  const [shifted, setShifted] = useState<λFile[]>([]);
  const [ isShiftPressed ] = useKeyHandler('Shift');

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();

    if (app.timeline.target && (key === 'd' || key === 'a')) {
      event.preventDefault();
      const delta = Number(key === 'a') ? 1 : -1;
      const target = Info.setTimelineTarget(delta);
      spawnDialog(<DisplayEventDialog event={target} />);
    }
  };

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
      onKeyDown={handleKeyDown}
      gap={12}
      flex
      onContextMenu={handleContextMenu}
      ref={timeline}>
      <ContextMenu>
        <ContextMenuTrigger>
          <Canvas timeline={timeline} scrollX={scrollX} scrollY={scrollY} shifted={shifted} setScrollX={setScrollX} setScrollY={setScrollY} />
          <Input img={null} type='file' accept='.yml' onChange={handleInputChange} ref={inputRef} className={s.upload_sigma_input} />
          <Navigator setScrollX={setScrollX} timeline={timeline} />
        </ContextMenuTrigger>
        <Menu />
      </ContextMenu>
    </Stack>
  );
}
