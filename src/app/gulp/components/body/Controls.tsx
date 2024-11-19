import { Button } from '@/ui/Button';
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';
import { Input } from '@/ui/Input';
import { useEffect, useRef } from 'react';

interface ControlsProps {
  scrollX: number;
  setScrollX: React.Dispatch<React.SetStateAction<number>>;
}

export function Controls({ scrollX, setScrollX }: ControlsProps) {
  const { Info, timeline, app, dialog } = useApplication();
  const size_plus = useRef<HTMLButtonElement>(null);
  const size_reset = useRef<HTMLButtonElement>(null);
  const size_minus = useRef<HTMLButtonElement>(null);

  const resetScaleAndScroll = () => {
    Info.setTimelineScale(dialog ? 0.5 : 1)
    setScrollX(dialog ? 16 : 0);
  }

  const zoom = (out: boolean = false) => {
    const timelineWidth = timeline.current?.clientWidth || 1;
    const currentScale = app.timeline.scale;
  
    const newScale = out
      ? currentScale - currentScale / 4
      : currentScale + currentScale / 4;
  
    const clampedScale = Math.min(Math.max(newScale, 0.01), 9999999);

    const centerOffset = (scrollX + timelineWidth / 2);
    const scaledOffset = (centerOffset * clampedScale) / currentScale;
    const left = scaledOffset - centerOffset;
  
    Info.setTimelineScale(clampedScale);
    setScrollX(scrollX + left);
  };
  
  
  const handleControllers = (event: KeyboardEvent) => {
    console.log(event.key);

    switch (true) {
      case event.key === '-':
        size_plus.current?.click();
        break;
        
        case event.key === '=':
        size_minus.current?.click();
        break;

      case event.key === '+':
        resetScaleAndScroll();
        break;
    
      default:
        break;
    }
  }

  useEffect(() => {
    window.addEventListener('keypress', handleControllers);

    return () => {
      window.removeEventListener('keypress', handleControllers);
    }

  }, []);

  return (
    <div className={s.controls}>
      <Button ref={size_plus} onClick={() => zoom(true)} img='ZoomOut'>Zoom Out</Button>
      <Button ref={size_reset} onClick={resetScaleAndScroll} img='AlignHorizontalSpaceBetween'>Zoom Fit</Button>
      <Button ref={size_minus} onClick={() => zoom(false)} img='ZoomIn'>Zoom In</Button>
      <Input className={s.filter} value={app.timeline.filter} placeholder='Filter by filenames and context' onChange={(e) => Info.setTimelineFilter(e.target.value)} img='Filter' />
    </div>
  )
}