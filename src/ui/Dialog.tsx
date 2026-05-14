import { useEffect } from 'react'
import s from './styles/Dialog.module.css'
import { cn } from '@impactium/utils'
import { Application } from '@/context/Application.context'
import { Stack } from './Stack'
import { Spinner } from './Spinner'
import { Button } from './Button'

export namespace Dialog {
  export interface Props extends Stack.Props {
    loading?: boolean
    callback?: () => void
    dockable?: boolean
  }
}

export function Dialog({
  className,
  callback,
  loading,
  dockable,
  children,
  ...props
}: Dialog.Props) {
  const { Info, banner, spawnDialog, dialogsDocked, setDialogsDocked, isDetachedWindow } = Application.use()

  const close = () => {
    if (callback) {
      callback()
    }

    spawnDialog(null)
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
    <Stack className={cn(s.dialog, className)} dir="column" ai='stretch' pos='relative' {...props}>
      {dockable && (
        <Stack
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          gap={8}
        >
          <Button
            variant='glass'
            size='sm'
            onClick={() => setDialogsDocked((value) => !value)}
            icon={isDetachedWindow ? 'PanelLeftOpen' : 'PictureInPicture2'}
            title={isDetachedWindow ? 'Dock dialog panel' : 'Undock dialog panel'}
          >
            {isDetachedWindow ? 'Dock' : 'Undock'}
          </Button>
        </Stack>
      )}
      <Stack dir='column' gap={12} ai='stretch' className={cn(s.content, loading && s.loading)} data-content>
        {loading ? <Spinner size={24} /> : children}
      </Stack>
    </Stack>
  )
}
