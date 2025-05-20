import { Button } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { Color } from '@impactium/types'
import { cn } from '@impactium/utils'
import s from './styles/Point.module.css'

export namespace Point {
  export interface Props extends Omit<Button.Props, 'type'> {
    x: number
    y: number
    icon: Icon.Name
    accent: Color
    name: string
    description?: string
    type: 'link' | 'note'
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
  type,
  ...props
}: Point.Props) {
  return (
    <Button
      size="icon"
      tabIndex={-1}
      variant="glass"
      aria-exportable
      className={cn(type === 'link' && s.round, className, s.target)}
      style={{ ...props.style, left: x, top: y, borderColor: accent }}
      {...props}
    >
      {props.children ?? <Icon name={icon} color={accent} />}
      <hr style={{ background: accent }} />
      {name && <p className={s.desc} style={{ y, x, borderColor: accent }}>
        {name}
      </p>}
      {description && (
        <span style={{ pointerEvents: 'none' }}>{description}</span>
      )}
    </Button>
  )
}
