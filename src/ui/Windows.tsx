import { Stack } from '@impactium/components'
import React, { useState, createContext, useContext, memo, useMemo } from 'react'
import { generateUUID } from './utils'
import s from './styles/Windows.module.css'
import { Icon } from '@impactium/icons'
import { useApplication } from '@/context/Application.context'
import { Menu } from '@/components/menu'
import { cn } from '@impactium/utils'
import { Resizer } from './Resizer'
import { Welcome } from '../page/Welcome.page'

export namespace Windows {
  export interface Props {
    windows: Window[]
    setWindows: React.Dispatch<React.SetStateAction<Window[]>>
    newWindow: (window: Omit<Window, 'uuid' | 'active'>) => void
    closeWindow: (window: Window['uuid']) => void
  }

  export interface Window extends Stack.Props {
    name: string
    uuid: string
    active?: boolean
    fixed?: boolean
    icon: Icon.Name
  }

  export class λWindow {
    public static active = (windows: Window[]) => windows.find((w) => w.active)

    public static normalize = (window: Partial<Window>): Window => ({
      ...window,
      active: window.active ?? true,
      uuid: window.uuid ?? (generateUUID() as Window['uuid']),
      name: window.name || 'New window',
      icon: window.icon || 'Window',
    })

    public static activate = (
      setWindows: Windows.Props['setWindows'],
      uuid?: Window['uuid'],
    ) => {
      setWindows((windows) =>
        windows.map((w) => ({
          ...w,
          active: uuid ? w.uuid === uuid : windows[0]?.uuid === w.uuid,
        })),
      )
    }
  }

  export const Context = createContext<Windows.Props | undefined>(undefined)

  // Мемоизированный компонент для диалога
  const DialogContainer = memo(({ dialog, dialogSize, setDialogSize }: {
    dialog: React.ReactNode
    dialogSize: number
    setDialogSize: (size: number) => void
  }) => (
    <Stack
      className={cn(s.dialog, dialog && s.open)}
      style={{ width: dialogSize }}
      pos="relative"
    >
      <Resizer init={dialogSize} set={setDialogSize} />
      {dialog}
    </Stack>
  ))

  // Мемоизированный компонент для активного окна
  const ActiveWindowContent = memo(({
    activeWindow,
    dialog,
    dialogSize,
    setDialogSize
  }: {
    activeWindow: Windows.Window
    dialog: React.ReactNode
    dialogSize: number
    setDialogSize: (size: number) => void
  }) => {
    const { children, uuid, className, ...props } = activeWindow

    return (
      <Stack key={uuid} gap={12} className={cn(s.window, className)} {...props}>
        <Menu />
        {children}
        <DialogContainer
          dialog={dialog}
          dialogSize={dialogSize}
          setDialogSize={setDialogSize}
        />
      </Stack>
    )
  })

  const ActiveWindow = memo(({ windows }: { windows: Windows.Window[] }) => {
    const { dialog, app, Info } = useApplication()

    // Мемоизируем активное окно - перерендер только при изменении активного окна
    const activeWindow = useMemo(() => {
      return Windows.λWindow.active(windows)
    }, [windows])

    // Мемоизируем стабильные значения из app и Info
    const dialogSize = useMemo(() => app.timeline.dialogSize, [app.timeline.dialogSize])
    const setDialogSize = useMemo(() => Info.setDialogSize, [Info.setDialogSize])

    if (!activeWindow) {
      return <Welcome.Page />
    }

    return (
      <ActiveWindowContent
        activeWindow={activeWindow}
        dialog={dialog}
        dialogSize={dialogSize}
        setDialogSize={setDialogSize}
      />
    )
  })

  export const Provider = () => {
    const [windows, setWindows] = useState<Windows.Window[]>([])

    // Мемоизируем функции чтобы избежать лишних перерендеров
    const newWindow = useMemo(() => (window: Omit<Windows.Window, 'uuid'>) => {
      setWindows((windows) => [...windows, Windows.λWindow.normalize(window)])
    }, [])

    const closeWindow = useMemo(() => (window: Windows.Window['uuid']) => {
      setWindows((winds) => {
        const newWindows = winds.filter((w) => w.uuid !== window)

        if (newWindows.length) {
          newWindows[newWindows.length - 1].active = true
        }

        return newWindows
      })
    }, [])

    const props: Windows.Props = useMemo(() => ({
      windows,
      setWindows,
      newWindow,
      closeWindow,
    }), [windows, newWindow, closeWindow])

    return (
      <Windows.Context.Provider value={props}>
        <ActiveWindow windows={windows} />
      </Windows.Context.Provider>
    )
  }

  ActiveWindow.displayName = 'ActiveWindow'
  ActiveWindowContent.displayName = 'ActiveWindowContent'
  DialogContainer.displayName = 'DialogContainer'
}

export const λWindow = Windows.λWindow

export const useWindows = (): Windows.Props =>
  useContext(Windows.Context) as Windows.Props
