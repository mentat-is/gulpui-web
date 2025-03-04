import { useEffect } from 'react'
import s from './styles/Dialog.module.css'
import { cn } from '@impactium/utils'
import { Stack } from '@impactium/components'
import { useApplication } from '@/context/Application.context'
import { Loading } from './Loading'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'

export namespace Dialog {
  export interface Props extends Stack.Props {
    title: string
    description?: React.ReactNode
    loading?: boolean
    icon?: string | React.ReactElement
    callback?: () => void
  }
}

export function Dialog({
  className,
  callback,
  icon,
  description,
  title,
  loading,
  children,
  ...props
}: Dialog.Props) {
  const { Info, spawnDialog } = useApplication()

  const close = () => {
    if (callback) {
      callback()
    }

    spawnDialog(<DisplayGroupDialog events={[]} />)
    Info.setTimelineTarget(null)
  }

  const handleDialogClose = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close()
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleDialogClose)

    return () => {
      document.removeEventListener('keydown', handleDialogClose)
    }
  }, [])

  return (
    <Stack className={cn(s.dialog, className)} dir="column" {...props}>
      <div className={s.wrapper}>
        {typeof icon === 'string' ? <img src={icon} alt="" /> : icon}
        <div className={s.header}>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className={cn(s.content, loading && s.loading)}>
        {loading ? <Loading size={48} variant="white" no_text /> : children}
      </div>
    </Stack>
  )
}
