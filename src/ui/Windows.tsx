import { μ } from "@/class/Info";
import { Button, Stack } from "@impactium/components";
import React, { useState, createContext, useContext, useEffect, useCallback } from "react";
import { cn, generateUUID } from "./utils";
import { Timeline } from "@/app/gulp/components/body/Timeline";
import s from './styles/Windows.module.css';
import { Icon } from "@impactium/icons";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { UploadBanner } from "@/banners/Upload.banner";
import { useApplication } from "@/context/Application.context";
import { Loading } from "@impactium/components";

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

  const DEFAULT_WINDOWS: Window[] = [
    λWindow.normalize({
      active: false,
      icon: 'Menu',
      name: 'Menu',
      fixed: true,
      // children: <MenuWindow />
    })
  ]

  export const Context = createContext<Windows.Props | undefined>(undefined);
  
  export const Provider = () => {
    const [windows, setWindows] = useState<Window[]>(DEFAULT_WINDOWS);

    const newWindow = (window: Omit<Window, 'uuid'>) => {
      setWindows(windows => [...windows, λWindow.normalize(window)]);
    }

    const closeWindow = (window: Window['uuid']) => {  
      setWindows(winds => {
        const newWindows = winds.filter(w => w.uuid !== window);

        newWindows[newWindow.length - 1].active = true;

        return newWindows;
      });
    }

    useEffect(() => {
      newWindow({
        children: <Timeline />,
        name: 'Timeline',
        icon: 'Edge'
      })
    }, []);

    const props: Windows.Props = {
      windows,
      setWindows,
      newWindow,
      closeWindow
    };

    const ActiveWindow = useCallback(() => {
      const active = λWindow.active(windows);

      if (!active) {
        return <NoWindows />;
      }

      const { uuid, className, ...props } = active;

      return <Stack key={uuid} className={cn(s.window, className)} {...props} />
    }, [windows]);

    return (
      <Context.Provider value={props}>
        <Navigator />
        <ActiveWindow />
      </Context.Provider>
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
      {windows.map(w => 
        <Stack ai='center' className={cn(w.active && s.active, s.tab)} onClick={() => λWindow.activate(setWindows, w.uuid)}>
          <Icon name={w.icon} size={14} />
          <p>{w.name}</p>
          <CloseButton {...w} />
        </Stack>
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