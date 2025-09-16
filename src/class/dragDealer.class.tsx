import React from 'react'
import { Info } from './Info'

interface DragDealerProps {
  info: DragDealer['info']
  timeline: DragDealer['timeline']
  setScrollX: DragDealer['setScrollX']
  increaseScrollY: DragDealer['increaseScrollY']
}

export class DragDealer implements DragDealerProps {
  clicked: boolean
  y: number
  x: number
  info: Info
  dragging: boolean
  timeline: React.RefObject<HTMLCanvasElement>
  setScrollX: React.Dispatch<React.SetStateAction<number>>
  increaseScrollY: (newY: number) => void

  constructor({
    info,
    timeline,
    setScrollX,
    increaseScrollY,
  }: DragDealerProps) {
    this.clicked = false
    this.x = 0
    this.y = 0
    this.info = info
    this.timeline = timeline
    this.setScrollX = setScrollX
    this.increaseScrollY = increaseScrollY
    this.dragging = true
  }

  dragStart = (ev: React.MouseEvent) => {
    this.y = ev.clientY
    this.x = ev.clientX
  }

  dragStop = () => {
    this.clicked = false
  }

  dragMove = (ev: React.MouseEvent) => {
    if (!this.clicked) return

    this.dragging = true

    const newY = this.y - ev.clientY
    const newX = this.x - ev.clientX

    this.y = ev.clientY
    this.x = ev.clientX

    this.setScrollX((scrollX) => Math.round(scrollX + newX))
    this.increaseScrollY(newY)
  }
}
