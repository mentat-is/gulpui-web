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

  const { mws, app, scrollY } = useApplication()
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

  const format = (date: Date, formatStr: string) => {
    const pad = (n: number, z = 2) => ('00' + n).slice(-z);

    const getters = {
      year: Internal.Settings.isUTCTimestamps ? date.getUTCFullYear() : date.getFullYear(),
      month: Internal.Settings.isUTCTimestamps ? date.getUTCMonth() + 1 : date.getMonth() + 1,
      day: Internal.Settings.isUTCTimestamps ? date.getUTCDate() : date.getDate(),
      hour: Internal.Settings.isUTCTimestamps ? date.getUTCHours() : date.getHours(),
      minute: Internal.Settings.isUTCTimestamps ? date.getUTCMinutes() : date.getMinutes(),
      second: Internal.Settings.isUTCTimestamps ? date.getUTCSeconds() : date.getSeconds(),
      ms: Internal.Settings.isUTCTimestamps ? date.getUTCMilliseconds() : date.getMilliseconds(),
    }

    return formatStr
      .replace('yyyy', getters.year.toString())
      .replace('MM', pad(getters.month))
      .replace('dd', pad(getters.day))
      .replace('HH', pad(getters.hour))
      .replace('mm', pad(getters.minute))
      .replace('ss', pad(getters.second))
      .replace('SSS', pad(getters.ms, 3))
  };

  const getDate = (value: number) => {
    Internal.Settings.isUTCTimestamps
    try {
      const date = new Date(value)
      return format(date, 'yyyy.MM.dd HH:mm:ss SSS')
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
            <Icon name="Gps" color={p.color} fill={p.color} />
            <p style={{ background: p.color }}>
              {p.id} {isYours ? `on ${getDate(timestamp)}ms` : null}
            </p>
          </Stack>
        )
      })}
    </Stack>
  )
}
