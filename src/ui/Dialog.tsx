import { useEffect } from 'react'
import s from './styles/Dialog.module.css'
import { cn } from '@impactium/utils'
import { Stack } from '@impactium/components'
import { useApplication } from '@/context/Application.context'
import { Loading } from '@impactium/components'
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
  const { Info, banner, spawnDialog } = useApplication()

  const close = () => {
    if (callback) {
      callback()
    }

    spawnDialog(<DisplayGroupDialog events={[]} />)
    Info.setTimelineTarget(null)
  }

  const handleDialogClose = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (banner) {
        return;
      }
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
    <Stack className={cn(s.dialog, className)} dir="column" ai='stretch' {...props}>
      <Stack className={s.wrapper} gap={12}>
        {icon}
        <Stack className={s.header} dir='column' ai='flex-start' gap={0} flex>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </Stack>
      </Stack>
      <Stack dir='column' ai='stretch' className={cn(s.content, loading && s.loading)}>
        {loading ? <Loading size='lg' variant="white" /> : children}
      </Stack>
    </Stack>
  )
}
