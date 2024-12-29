import React from 'react';
import { Info } from './Info';

interface DragDealerProps {
  info: DragDealer['info'],
  timeline: DragDealer['timeline'],
  setScrollX: DragDealer['setScrollX'];
  increaseScrollY: DragDealer['increaseScrollY'];
}

export class DragDealer implements DragDealerProps {
  clicked: boolean;
  y: number;
  x: number;
  info: Info;
  timeline: React.RefObject<HTMLDivElement>;
  setScrollX: React.Dispatch<React.SetStateAction<number>>;
  increaseScrollY: (λy: number) => void;

  constructor({ info, timeline, setScrollX, increaseScrollY }: DragDealerProps) {
    this.clicked = false;
    this.x = 0;
    this.y = 0;
    this.info = info;
    this.timeline = timeline;
    this.setScrollX = setScrollX;
    this.increaseScrollY = increaseScrollY;
  }

  dragStart = (ev: React.MouseEvent) => {
    this.y = ev.clientY;
    this.x = ev.clientX;
    this.clicked = true;
  };

  dragStop = () => {
    window.requestAnimationFrame(() => this.clicked = false);
  };

  dragMove = (ev: React.MouseEvent) => {
    if (!this.clicked) return;
    
    const λy = this.y - ev.clientY;
    const λx = this.x - ev.clientX;

    this.y = ev.clientY;
    this.x = ev.clientX;

    this.setScrollX(scrollX => Math.round(scrollX + λx));
    this.increaseScrollY(λy);
  }
}
