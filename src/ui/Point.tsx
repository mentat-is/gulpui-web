import { Button } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { Color } from '@impactium/types'
import { cn } from '@impactium/utils'
import s from './styles/Point.module.css'

export namespace Point {
  export interface Props extends Button.Props {
    x: number
    y: number
    icon: Icon.Name
    accent: Color
    name: string
    description?: string
  }
}

export function Point({
  x,
  y,
  icon,
  accent,
  className,
  name,
  description,
  ...props
}: Point.Props) {
  return (
    <Button
      size="icon"
      variant="glass"
      className={cn(className, s.target)}
      style={{ ...props.style, left: x, top: y, borderColor: accent }}
      {...props}
    >
      <Icon name={icon} color={accent} />
      <hr style={{ background: accent }} />
      <p className={s.desc} style={{ y, x, borderColor: accent }}>
        {name}
      </p>
      {description && (
        <span style={{ pointerEvents: 'none' }}>{description}</span>
      )}
    </Button>
  )
}
