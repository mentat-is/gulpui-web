import { useApplication } from '@/context/Application.context';
import { getDateFormat, getTimestamp } from '@/ui/utils';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';

export const useMagnifier = (scrollX: number, canvas_ref: React.RefObject<HTMLCanvasElement>, dependencies: Array<any>, magnifierSize = 100, magnificationFactor = 2) => {
  const magnifier_ref = useRef<HTMLCanvasElement>(null);
  const { Info } = useApplication()
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const drawMagnifier = () => {
    const canvas = canvas_ref.current;
    const magnifier = magnifier_ref.current;
    if (!magnifier || !canvas) return;
 
    const ctx = canvas.getContext("2d");
    const magnifierCtx = magnifier.getContext("2d");

    if (ctx && magnifierCtx) {
      magnifierCtx.clearRect(0, 0, magnifier.width, magnifier.height);

      const x = Math.max(0, mousePosition.x - magnifierSize / (2 * magnificationFactor));
      const y = Math.max(0, mousePosition.y - magnifierSize / (2 * magnificationFactor));
      const w = magnifierSize / magnificationFactor;
      const d = magnifierSize * magnificationFactor;

      magnifierCtx.imageSmoothingEnabled = false;
      magnifierCtx.drawImage(canvas, x, y, w, w, 0, 0, d, d);
    }
  };

  useEffect(() => {
    isShiftPressed && drawMagnifier();
  }, [isShiftPressed, mousePosition, ...dependencies]);

  const handleMouseMove = ({ clientX, clientY }: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = canvas_ref.current!.getBoundingClientRect();
    setMousePosition({
      x: clientX - left,
      y: clientY - top,
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Shift') {
      setIsShiftPressed(true);
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Shift') {
      setIsShiftPressed(false);
    }
  };

  return { up: handleKeyUp, down: handleKeyDown, move: handleMouseMove, magnifier_ref, isShiftPressed, mousePosition };
};
