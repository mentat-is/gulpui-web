import { Application } from '@/context/Application.context'
import s from './styles/Pointers.module.css'
import { Icon } from '@impactium/icons'
import { cn } from '@impactium/utils'
import { XY } from '@/dto/XY.dto'
import { formatTimestampToReadableString } from '@/ui/utils'
import { Stack } from '@/ui/Stack'
import { User } from '@/entities/User'

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
    id: User.Id
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
  const { app, scrollY } = Application.use()

  const you: Pointers.Pointer = {
    ...self,
    color: 'var(--green-700)',
    id: 'You' as User.Id,
    timestamp,
  }

  return (
    <Stack aria-pointers pos="absolute" className={s.pointers} {...props}>
      {[you, ...app.timeline.pointers].map((p) => {
        const isYours = p.id === ('You' as User.Id)
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
