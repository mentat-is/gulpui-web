import { useApplication } from '@/context/Application.context'
import { Stack } from '@impactium/components'
import s from './styles/Pointers.module.css'
import { λUser } from '@/class/Info'
import { useRef, useState } from 'react'
import { Icon } from '@impactium/icons'
import { cn } from '@impactium/utils'
import { XY } from '@/dto/XY.dto'
import { format } from 'date-fns'
import { Logger } from '@/dto/Logger.class'

export namespace Pointers {
  export interface Props extends Stack.Props {
    getPixelPosition: (t: number) => number
    scrollY: number
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
  scrollY,
  width,
  self,
  timestamp,
  ...props
}: Pointers.Props) {
  const COLOR_MAPPING: string[] = [
    'gray',
    'blue',
    'red',
    'amber',
    'green',
    'teal',
    'purple',
    'pink',
  ]

  const { mws, app } = useApplication()
  const color = useRef<string>(
    `var(--${COLOR_MAPPING[Math.round(Math.random() * COLOR_MAPPING.length)]})-700`,
  )
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(Date.now())

  const send = () => {
    if (!mws) {
      return
    }

    if (lastSyncTimestamp + 250 > Date.now()) {
      return
    }

    mws.sendPointer({
      id: app.general.id,
      timestamp: timestamp,
      color: color.current,
      y: Math.round(self.y) + scrollY,
    })
    setLastSyncTimestamp(Date.now())
  }

  send()

  const getDate = (value: number) => {
    try {
      return format(new Date(value).getTime(), 'yyyy.MM.dd HH:mm:ss SSS')
    } catch (error) {
      Logger.error(
        `Invalid time value. Expected number | string | Date, got ${value}`,
        'Timestamp',
      )
      return ''
    }
  }

  const you: Pointers.Pointer = {
    ...self,
    color: 'var(--green-700)',
    id: 'You' as λUser['id'],
    timestamp,
  }

  return (
    <Stack pos="absolute" className={s.pointers} {...props}>
      {[you, ...app.timeline.pointers].map((p) => {
        const isYours = p.id === ('You' as λUser['id'])
        const x = p.x || getPixelPosition(p.timestamp)
        const isRightSide = x > width / 2

        return (
          <Stack
            key={p.id}
            className={cn(s.pointer, isRightSide && s.right)}
            style={{ top: isYours ? p.y : -scrollY + p.y, left: x }}
            pos="absolute"
          >
            <Icon name="Pointer" color={p.color} fill={p.color} />
            <p style={{ background: p.color }}>
              {p.id} {isYours ? `on ${getDate(timestamp)}ms` : null}
            </p>
          </Stack>
        )
      })}
    </Stack>
  )
}
