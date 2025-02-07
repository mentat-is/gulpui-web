import { SetState } from '@/class/API';
import { DragDealer } from '@/class/dragDealer.class';
import { Info } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { StartEnd, StartEndBase } from '@/dto/StartEnd.dto';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function useKeyHandler(key: string) {
  const [isKeyPressed, setIsKeyPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === key) {
        setIsKeyPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === key) {
        setIsKeyPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [key]);

  return [ isKeyPressed ];
}


export namespace UseDrugs {
  export interface Props {
    Info: Info,
    timeline: RefObject<HTMLCanvasElement>;
    setScrollX: SetState<number>;
    setScrollY: SetState<number>;
  }
}

export const useDrugs = ({ Info, timeline, setScrollX, setScrollY }: UseDrugs.Props) => {
  const { app } = useApplication();
  const [resize, setResize] = useState<StartEnd>(StartEndBase);
  const [isResizing, setIsResizing] = useState(false);

  const increaseScrollY = useCallback((λy: number) => {
    setScrollY((y) => Math.round(y + λy));
  }, [app, timeline]);

  const dragState = useRef(new DragDealer({ info: Info, timeline, setScrollX, increaseScrollY }));

  useEffect(() => {
      dragState.current = new DragDealer({ info: Info, timeline, setScrollX, increaseScrollY });
  }, [timeline]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    dragState.current.dragStart(event);
    const rect = timeline.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    if (event.altKey) {
      setResize({ start: event.clientX - rect.x, end: event.clientX - rect.x });
      setIsResizing(true);
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = timeline.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    if (isResizing) {
      setResize(prev => ({ ...prev, end: event.clientX - rect.x }));
      return;
    }

    dragState.current.dragMove(event);
  }, [isResizing]);

  const handleMouseUpOrLeave = useCallback((event: MouseEvent) => {
    event.preventDefault();
    dragState.current.dragStop();

    if (isResizing) {
      const min = Math.min(resize.end, resize.start);
      const max = Math.max(resize.end, resize.start);
      const scale = Info.width / (max - min);

      if (!isFinite(scale)) return toast("Selected frame too small");

      Info.setTimelineScale(scale);
      setScrollX((scrollX + min) * (scale / Info.app.timeline.scale));
    }

    setResize(StartEndBase);
    setIsResizing(false);
  }, [isResizing, resize, Info, setScrollX, Info.app.timeline.scale]);

  console.log(resize);

  return { resize, isResizing, handleMouseDown, handleMouseMove, handleMouseUpOrLeave };
};
