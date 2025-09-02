import { useApplication } from '@/context/Application.context'
import { Stack } from '@impactium/components'
import s from './styles/Pointers.module.css'
import { Internal, λUser } from '@/class/Info'
import { useCallback, useRef, useState } from 'react'
import { Icon } from '@impactium/icons'
import { cn } from '@impactium/utils'
import { XY } from '@/dto/XY.dto'
import { format } from 'date-fns'
import { Logger } from '@/dto/Logger.class'
import { SmartSocket } from '@/class/SmartSocket'
import { formatTimestampToReadableString } from '@/ui/utils'

export namespace Pointers {
  export interface Props extends Stack.Props {
    getPixelPosition: (t: number) => number
    width: number
    self: XY
    timestamp: number
  }

  export interface Pointer {
    timestamp: number
    y: number
    x?: number
    id: λUser['id']
    color: string
  }
}

export function Pointers({
  getPixelPosition,
  width,
  self,
  timestamp,
  ...props
}: Pointers.Props) {
  const { app, scrollY } = useApplication()

  const you: Pointers.Pointer = {
    ...self,
    color: 'var(--green-700)',
    id: 'You' as λUser['id'],
    timestamp,
  }

  return (
    <Stack aria-pointers pos="absolute" className={s.pointers} {...props}>
      {[you, ...app.timeline.pointers].map((p) => {
        const isYours = p.id === ('You' as λUser['id'])
        const x = p.x || getPixelPosition(p.timestamp)
        const isRightSide = x > width / 2

        return (
          <Stack
            key={p.id}
            className={cn(s.pointer, isRightSide && s.right, !isYours && s.guest)}
            style={{ top: isYours ? p.y : -scrollY + p.y, left: x }}
            pos="absolute"
          >
            <Icon name="Gps" color={p.color} fill={p.color} />
            <p style={{ background: p.color }}>
              {p.id} {isYours ? `on ${formatTimestampToReadableString(timestamp)}ms` : null}
            </p>
          </Stack>
        )
      })}
    </Stack>
  )
}
