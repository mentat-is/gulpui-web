import { useState, useEffect, useRef, MouseEvent } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from "@/ui/ContextMenu";
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';
import { Controls } from './Controls';
import { Ruler } from './Ruler';
import { DragDealer } from '@/class/dragDealer.class';
import { TimelineCanvas } from './TimelineCanvas';
import { File } from '@/class/Info';
import { StartEnd, StartEndBase } from '@/dto/StartEnd.dto';
import { SettingsFileBanner } from '@/banners/SettingsFileBanner';
import { cn, ui } from '@/ui/utils';
import { λFile } from '@/dto/File.dto';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';
import { FilterFileBanner } from '@/banners/FilterFileBanner';

export function Timeline() {
  const { app, Info, banner, dialog, timeline, spawnBanner } = useApplication();
  const [scrollX, _setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(0);
  const [resize, setResize] = useState<StartEnd>(StartEndBase);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [bounding, setBounding] = useState<DOMRect>();
  const [selectedFileForContextMenu, setSelectedFileForContextMenu] = useState<λFile>();

  function deltaScrollX(λx: number) {
    const limit = Info.width - (timeline.current?.clientWidth || 0);

    _setScrollX((x) => Math.max(0, Math.min(limit, Math.round(x + λx))));
  }

  function increaseScrollY(λy: number) {
    const limit = File.selected(app).length * 48 - (timeline.current?.clientHeight || 0) + 42
    setScrollY((y) => Math.max(0, Math.min(Math.round(limit), Math.round(y + λy))));
  }

  const handleWheel = (event: WheelEvent) => {
    if (!timeline.current || banner) return;

    if (dialog && event.clientX > (window.innerWidth / 2)) {
      return;
    } else {
      event.preventDefault();
    }

    const width = Info.width;
    const newScale = event.deltaY > 0 ? Info.decreaseTimelineScale() : Info.increaseTimelineScale();

    const rect = bounding || timeline.current!.getBoundingClientRect();
    if (!bounding) {
      setBounding(rect);
    }

    const diff = scrollX + event.clientX - rect.left;
    const left = Math.round(diff * (newScale * timeline.current.clientWidth) / width - diff);

    deltaScrollX(left);
  };

  const handleMouseDown = (event: MouseEvent) => {
    dragState.current.dragStart(event);
    if (event.altKey) {
      setResize({ start: event.clientX, end: event.clientX });
      setIsResizing(true);
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    isResizing ? setResize((prev) => ({ ...prev, end: event.clientX })) : dragState.current.dragMove(event);
  };

  const handleMouseUpOrLeave = (event: any) => {
    event?.preventDefault();
    dragState.current.dragStop();
  
    if (isResizing) {
      const min = Math.min(resize.end, resize.start);
      const max = Math.max(resize.end, resize.start);

      const scale = Info.width / (max - min);
      
      if (scale === Infinity) return;

      const scroll = (scrollX + min) * (scale / app.timeline.scale);
  
      Info.setTimelineScale(scale);
      _setScrollX(scroll);
    }
  
    setResize(StartEndBase);
    setIsResizing(false);
  };

  const dragState = useRef(new DragDealer({ info: Info, timeline, deltaScrollX, increaseScrollY }));

  useEffect(() => {
    if (isResizing) return;

    dragState.current = new DragDealer({ info: Info, timeline, deltaScrollX, increaseScrollY });

    window.addEventListener('wheel', handleWheel as any, { passive: false });
    window.addEventListener('resize', setBounding(undefined) as any, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel as any);
      window.removeEventListener('resize', setBounding(undefined) as any);
    };
  }, [timeline, banner, dialog, app.timeline.scale, isResizing]);

  const handleContextMenu = (event: MouseEvent) => {
    const index = Math.floor((event.clientY + scrollY - timeline.current!.getBoundingClientRect().top - 24) / 48)
    const file = File.selected(app)[index];
    setSelectedFileForContextMenu(file);
  };

  return (
    <div
      id="timeline"
      className={cn(s.timeline, dialog && s.short)}
      onMouseLeave={handleMouseUpOrLeave} // Завершаем действие при выходе мыши
      onMouseUp={handleMouseUpOrLeave} // Завершаем действие при отпускании мыши
      onMouseDown={handleMouseDown} // Начинаем действие при нажатии
      onMouseMove={handleMouseMove} // Обновляем конечную позицию при движении мыши
      onWheel={e => !!e}
      onContextMenu={handleContextMenu}
      ref={timeline}
    >
      <Ruler scrollX={scrollX} />
      <div className={s.content} id="timeline_content">
      <ContextMenu>
          <ContextMenuTrigger>
            <TimelineCanvas resize={resize} timeline={timeline} scrollX={scrollX} scrollY={scrollY} />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ContextMenuLabel className={s.cm_title}>{selectedFileForContextMenu?.name || '...'}</ContextMenuLabel>
                </TooltipTrigger>
                <TooltipContent>
                  {selectedFileForContextMenu?.name || '...'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => spawnBanner(<SettingsFileBanner file={selectedFileForContextMenu!} />)} img={ui('action/settings')}>Settings</ContextMenuItem>
            <ContextMenuItem onClick={() => spawnBanner(<FilterFileBanner file={selectedFileForContextMenu!} />)} img={ui('action/filter')}>Filters</ContextMenuItem>
            <ContextMenuItem onClick={() => Info.files_unselect(selectedFileForContextMenu!)} img={ui('action/hide')}>Hide</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      <Controls />
    </div>
  );
}
