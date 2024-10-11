import { useState, useEffect, useRef, MouseEvent, useMemo, useCallback } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from "@/ui/ContextMenu";
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';
import { Ruler } from './Ruler';
import { DragDealer } from '@/class/dragDealer.class';
import { TimelineCanvas } from './TimelineCanvas';
import { File } from '@/class/Info';
import { StartEnd, StartEndBase } from '@/dto/StartEnd.dto';
import { SettingsFileBanner } from '@/banners/SettingsFileBanner';
import { cn } from '@/ui/utils';
import { λFile } from '@/dto/File.dto';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';
import { FilterFileBanner } from '@/banners/FilterFile.banner';
import { DisplayEventDialog } from '@/dialogs/DisplayEventDialog';
import { LinkVisualizer } from '@/banners/LinksVisualizer';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { Controls } from './Controls';

export function Timeline() {
  const { app, Info, banner, dialog, timeline, spawnBanner, spawnDialog } = useApplication();
  const [scrollX, setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(0);
  const [resize, setResize] = useState<StartEnd>(StartEndBase);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [bounding, setBounding] = useState<DOMRect | null>(null);
  const [selectedFileForContextMenu, setSelectedFileForContextMenu] = useState<λFile>();

  const increaseScrollY = useCallback((λy: number) => {
    const limit = File.selected(app).length * 48 - (timeline.current?.clientHeight || 0) + 42
    setScrollY((y) => Math.max(0, Math.min(Math.round(limit), Math.round(y + λy))));
  }, [app, timeline]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!timeline.current || banner) return;
    
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      setScrollX(scrollX => scrollX + event.deltaX);
      return;
    }

    const width = Info.width;
    const newScale = event.deltaY > 0 ? Info.decreasedTimelineScale() : Info.increasedTimelineScale();

    const rect = bounding || timeline.current.getBoundingClientRect();
    if (!bounding) {
      setBounding(rect);
    }

    const diff = scrollX + event.clientX - rect.left;
    const left = Math.round(diff * (newScale * timeline.current.clientWidth) / width - diff);

    Info.setTimelineScale(newScale);
    setScrollX(scrollX => scrollX + left);
  }, [timeline, banner, Info, bounding, app.timeline.scale, scrollX]);

  const debouncedHandleWheel = useMemo(
    () => debounce(handleWheel, 5),
    [handleWheel]
  );

  const handleMouseDown = useCallback((event: MouseEvent) => {
    dragState.current.dragStart(event);
    if (event.altKey) {
      setResize({ start: event.clientX, end: event.clientX });
      setIsResizing(true);
    }
  }, []);

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
    if (isResizing) return;

    dragState.current = new DragDealer({ info: Info, timeline, setScrollX, increaseScrollY });

    const handleResize = () => setBounding(null);
    window.addEventListener('resize', handleResize, { passive: true });

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

  const handleContextMenu = useCallback((event: MouseEvent) => {
    const index = Math.floor((event.clientY + scrollY - timeline.current!.getBoundingClientRect().top - 24) / 48)
    const files = File.selected(app)
    const file = files[index];
    setSelectedFileForContextMenu(file);
  }, [app, scrollY, timeline]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();

    if (app.timeline.target && (key === 'd' || key === 'a')) {
      event.preventDefault();
      const delta = Number(key === 'a') || -1;
      const events = File.events(app, app.timeline.target._uuid);
      const index = events.findIndex(evevt => evevt._id === app.timeline.target!._id) + delta

      spawnDialog(<DisplayEventDialog event={events[index] ?? app.timeline.target} />)
    }
  }, [app.timeline.target, spawnDialog]);

  return (
    <div
      id="timeline"
      className={cn(s.timeline)}
      onMouseLeave={handleMouseUpOrLeave}
      onMouseUp={handleMouseUpOrLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      onWheel={e => !!e}
      onContextMenu={handleContextMenu}
      ref={timeline}
    >
      <Ruler scrollX={scrollX} />
      <div className={s.content} id="timeline_content">
        <ContextMenu>
          <ContextMenuTrigger>
            <TimelineCanvas resize={resize} timeline={timeline} scrollX={scrollX} scrollY={scrollY} />
            <Controls setScrollX={setScrollX} scrollX={scrollX} />
          </ContextMenuTrigger>
          {selectedFileForContextMenu && <ContextMenuContent>
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
            <ContextMenuItem onClick={() => Info.files_repin(selectedFileForContextMenu!.uuid)} img={selectedFileForContextMenu?.pinned ? 'PinOff' : 'Pin'}>{selectedFileForContextMenu ? selectedFileForContextMenu.pinned ? 'Unpin' : 'Pin' : '...'}</ContextMenuItem>
            <ContextMenuItem onClick={() => spawnBanner(<SettingsFileBanner file={selectedFileForContextMenu!} />)} img='Settings'>Settings</ContextMenuItem>
            <ContextMenuItem onClick={() => spawnBanner(<FilterFileBanner file={selectedFileForContextMenu!} />)} img='Filter'>Filters</ContextMenuItem>
            <ContextMenuItem onClick={() => spawnBanner(<LinkVisualizer file={selectedFileForContextMenu!} />)} img='Waypoints'>Links</ContextMenuItem>
            <ContextMenuItem onClick={() => Info.files_unselect(selectedFileForContextMenu!)} img='EyeOff'>Hide</ContextMenuItem>
            <ContextMenuItem onClick={() => Info.files_reorder_upper(selectedFileForContextMenu!.uuid)} img='ArrowBigUp'>Move upper</ContextMenuItem>
            <ContextMenuItem onClick={() => Info.files_reorder_lower(selectedFileForContextMenu!.uuid)} img='ArrowBigDown'>Move lower</ContextMenuItem>
          </ContextMenuContent>}
        </ContextMenu>
      </div>
    </div>
  );
}