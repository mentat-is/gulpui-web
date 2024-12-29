import { μ } from '@/class/Info';
import { Button, Stack } from '@impactium/components';
import React, { useState, createContext, useContext, useEffect, useCallback, memo } from 'react';
import { cn, generateUUID } from './utils';
import { Timeline } from '@/app/gulp/components/body/Timeline';
import s from './styles/Windows.module.css';
import { Icon } from '@impactium/icons';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { UploadBanner } from '@/banners/Upload.banner';
import { useApplication } from '@/context/Application.context';
import { Loading } from '@impactium/components';
import { MenuDialog } from '@/app/gulp/components/header/Menu.dialog';

export namespace Windows {
  export interface Props {
    windows: Window[];
    setWindows: React.Dispatch<React.SetStateAction<Window[]>>;
    newWindow: (window: Omit<Window, 'uuid' | 'active'>) => void;
    closeWindow: (window: Window['uuid']) => void;
  }

  export interface Window extends Stack.Props {
    name: string;
    uuid: μ.Window;
    active?: boolean;
    fixed?: boolean;
    icon: Icon.Name;
  }

  export class λWindow {
    public static active = (windows: Window[]) => windows.find(w => w.active);

    public static normalize = (window: Partial<Window>): Window => ({
      ...window,
      active: window.active ?? true,
      uuid: window.uuid ?? generateUUID() as Window['uuid'],
      name: window.name || 'New window',
      icon: window.icon || 'Window'
    });

    public static activate = (setWindows: Windows.Props['setWindows'], uuid?: Window['uuid']) => {
      setWindows(windows => windows.map(w => ({
        ...w,
        active: uuid ? w.uuid === uuid : windows[0]?.uuid === w.uuid
      })))
    }
  }

  export const Context = createContext<Windows.Props | undefined>(undefined);

  const ActiveWindow = memo(({ windows }: { windows: Windows.Window[] }) => {
    const active = Windows.λWindow.active(windows);

    if (!active) {
      return <NoWindows />;
    }

    const { uuid, className, ...props } = active;

    return <Stack key={uuid} className={cn(s.window, className)} {...props} />;
  });

  export const Provider = () => {
    const { spawnDialog } = useApplication();

    const DEFAULT_WINDOWS: Windows.Window[] = [
      Windows.λWindow.normalize({
        active: false,
        icon: 'Menu',
        name: 'Menu',
        fixed: true,
        onClick: () => spawnDialog(<MenuDialog />),
      }),
    ];

    const [windows, setWindows] = useState<Windows.Window[]>(DEFAULT_WINDOWS);

    const newWindow = (window: Omit<Windows.Window, 'uuid'>) => {
      setWindows((windows) => [...windows, Windows.λWindow.normalize(window)]);
    };

    const closeWindow = (window: Windows.Window['uuid']) => {
      setWindows((winds) => {
        const newWindows = winds.filter((w) => w.uuid !== window);

        if (newWindows.length) {
          newWindows[newWindows.length - 1].active = true;
        }

        return newWindows;
      });
    };

    const props: Windows.Props = {
      windows,
      setWindows,
      newWindow,
      closeWindow,
    };

    return (
      <Windows.Context.Provider value={props}>
        <Navigator />
        <ActiveWindow windows={windows} />
      </Windows.Context.Provider>
    );
  };
}

export const λWindow = Windows.λWindow;

export const useWindows = (): Windows.Props => useContext(Windows.Context)!;

const Navigator = () => {
  const { windows, setWindows, closeWindow } = useWindows();

  const CloseButton = useCallback((w: Windows.Window) => {
    if (w.fixed) {
      return null;
    }

    return <Button className={s.x} img='X' size='icon' variant='ghost' onClick={() => closeWindow(w.uuid)} />
  }, [windows]);

  return (
    <Stack pos='relative' ai='flex-end' className={s.navigation}>
      {windows.map(w => {
        if (!w.onClick) {
          w.onClick = () => λWindow.activate(setWindows, w.uuid);
        }
        return <Stack ai='center' className={cn(w.active && s.active, s.tab)} {...w}>
          <Icon name={w.icon} size={14} />
          <p>{w.name}</p>
          <CloseButton {...w} />
        </Stack>
      }
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button img='Plus' className={s.new} size='icon' variant='glass' />
        </PopoverTrigger>
        <PopoverContent>
          <Button>Open timeline</Button>
          <Button>Open notes</Button>
          <Button>Open links</Button>
          <Button>Open upload</Button>
        </PopoverContent>
      </Popover>
    </Stack>
  )
}

const NoWindows = () => {
  const { newWindow } = useWindows();
  const { spawnBanner } = useApplication();

  const [loading, setLoading] = useState<boolean>(false);

  const openTimeline = () => {
    setLoading(true);

    setTimeout(() => {
      newWindow({
        icon: 'Edge',
        children: <Timeline />,
        name: 'Timeline'
      });
    }, 500);
  }

  return (
    <Stack className={cn(s.window, s.noWindows)} dir='column' jc='center'>
      <h3>Welcome to gULP workspace</h3>
      <p>Choose action below</p>
      <Stack>
        <Button size='lg' img='Upload' variant='secondary' className={s.rounded} onClick={() => spawnBanner(<UploadBanner />)}>Upload file</Button>
        {loading
        ? <Button size='lg' img='LoaderCircle' className={cn(s.rounded, s.loading)} asChild><Loading size='lg' variant='default' /></Button>
        : <Button size='lg' img='Edge' className={s.rounded} onClick={openTimeline}>Open timeline</Button>}
      </Stack>
      <Button className={s.hint} variant='link' asChild><a href='https://github.com/mentat-is/gulpui-web/blob/master/README.md'>See documentation for more information</a></Button> 
    </Stack>
  )
}
