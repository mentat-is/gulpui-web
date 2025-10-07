import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Application } from '../context/Application.context'
import s from './styles/Banner.module.css'
import { cn } from '@impactium/utils'
import { Stack } from './Stack'
import { Cell } from './Cell'
import { Skeleton } from './Skeleton'
import { Button } from './Button'

export namespace Banner {
  export interface Props extends Stack.Props {
    title?: string
    subtitle?: ReactNode
    done?: ReactNode
    side?: ReactNode
    fixed?: boolean
    loading?: boolean
    onClose?: () => void
    option?: ReactNode | null
    back?: () => void | null
  }
}

export function Banner({
  children,
  back,
  className,
  title,
  fixed,
  option,
  loading,
  done,
  subtitle = null,
  side = null,
  onClose,
}: Banner.Props) {
  const { destroyBanner } = Application.use()
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  const close = () => {
    if (onClose) onClose()

    destroyBanner()
  }

  useEffect(() => {
    if (fixed) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('popstate', close)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('popstate', close)
    }
  }, [])

  const Side = useMemo(() => {
    if (!side) {
      return null
    }

    return (
      <Stack className={cn(s.side, isExpanded && s.open)} pos="absolute">
        <Stack className={s.side_content} pos="relative">
          {side}
        </Stack>
      </Stack>
    )
  }, [side, isExpanded, setIsExpanded])

  return (
    <div className={s.wrapper}>
      <div
        className={cn(s.banner, s.loading, className)}>
        <Cell key="cell-1" className={s.cell} top left>
          {back && <Button variant='tertiary' icon="CornerUpLeft" onClick={back} />}
        </Cell>
        <Cell key="cell-2" className={s.cell} top right>
          {fixed ? null : (
            <Button
              variant='tertiary'
              onClick={close}
              icon="X"
              loading={loading}
              shape='icon'
            />
          )}
        </Cell>
        <Cell key="cell-3" className={s.cell} bottom left>
          {side ? (
            <Button
              icon={isExpanded ? 'Eye' : 'EyeOff'}
              onClick={() => setIsExpanded((isExpanded) => !isExpanded)}
              variant={isExpanded ? 'secondary' : 'tertiary'}
            />
          ) : (
            option
          )}
        </Cell>
        <Cell key="cell-4" className={cn(s.cell, s.done)} bottom right>
          {done}
        </Cell>
        {Side}
        {title && <h6>
          {loading ? <Skeleton width="long" height={24} /> : title}
          {subtitle ? loading ? <Skeleton height={24} /> : subtitle : null}
        </h6>}
        <Stack dir="column" ai="unset" gap={12} className={s.content} data-banner-content>
          {children}
        </Stack>
      </div>
    </div>
  )
}
