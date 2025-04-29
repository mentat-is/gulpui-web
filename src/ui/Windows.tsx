import { Stack } from '@impactium/components'
import React, { useState, createContext, useContext, memo } from 'react'
import { generateUUID } from './utils'
import s from './styles/Windows.module.css'
import { Icon } from '@impactium/icons'
import { useApplication } from '@/context/Application.context'
import { Menu } from '@/components/menu'
import { cn } from '@impactium/utils'
import { Resizer } from './Resizer'
import { Welcome } from '../page/Welcome.page'
import { Plugin } from '@/context/Plugin.context'

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

  const ActiveWindow = memo(({ windows }: { windows: Windows.Window[] }) => {
    const { dialog, app, Info } = useApplication()
    const active = Windows.λWindow.active(windows)

    if (!active) {
      return <Welcome.Page />
    }

    const { children, uuid, className, ...props } = active

    return (
      <Stack key={uuid} gap={12} className={cn(s.window, className)} {...props}>
        <Menu />
        {children}
        <Stack
          className={cn(s.dialog, dialog && s.open)}
          style={{ width: app.timeline.dialogSize }}
          pos="relative"
        >
          <Resizer init={app.timeline.dialogSize} set={Info.setDialogSize} />
          {dialog}
        </Stack>
      </Stack>
    )
  })

  export const Provider = () => {
    const [windows, setWindows] = useState<Windows.Window[]>([])

    const newWindow = (window: Omit<Windows.Window, 'uuid'>) => {
      setWindows((windows) => [...windows, Windows.λWindow.normalize(window)])
    }

    const closeWindow = (window: Windows.Window['uuid']) => {
      setWindows((winds) => {
        const newWindows = winds.filter((w) => w.uuid !== window)

        if (newWindows.length) {
          newWindows[newWindows.length - 1].active = true
        }

        return newWindows
      })
    }

    const props: Windows.Props = {
      windows,
      setWindows,
      newWindow,
      closeWindow,
    }

    return (
      <Windows.Context.Provider value={props}>
        <ActiveWindow windows={windows} />
      </Windows.Context.Provider>
    )
  }

  ActiveWindow.displayName = 'ActiveWindow'
}

export const λWindow = Windows.λWindow

export const useWindows = (): Windows.Props =>
  useContext(Windows.Context) as Windows.Props
