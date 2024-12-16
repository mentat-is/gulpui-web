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
    active: boolean;
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

    public static activate = (setWindows: Windows.Props['setWindows']) => {
      setWindows(windows => {
        const [activate, ...winds] = windows;

        if (!activate) {
          return windows;
        }

        activate.active = true;

        return [activate, ...winds];
      })
    }
  }

  export const Context = createContext<Windows.Props | undefined>(undefined);
  
  export const Provider = () => {
    const [windows, setWindows] = useState<Window[]>([]);

    const newWindow = (window: Omit<Window, 'uuid' | 'active'>) => {
      setWindows(windows => [...windows, λWindow.normalize(window)]);
    }

    const closeWindow = (window: Window['uuid']) => {  
      setWindows(winds => winds.filter(w => w.uuid !== window));
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

    useEffect(() => {
      if (λWindow.active(windows))
        return;

      λWindow.activate(setWindows);
    }, [windows]);

    const ActiveWindow = useCallback(() => {
      const active = λWindow.active(windows);

      if (!active) {
        return <NoWindows />;
      }

      const { uuid, ...props } = active;

      return <Stack key={uuid} className={s.window} {...props} />
    }, [windows]);

    return (
      <Context.Provider value={props}>
        <Navigator />
        <ActiveWindow />
      </Context.Provider>
    );
  };
}

export const useWindows = (): Windows.Props => useContext(Windows.Context)!;

const Navigator = () => {
  const { windows, closeWindow } = useWindows();

  return (
    <Stack pos='relative' ai='flex-end' className={s.navigation}>
      {windows.map(w => 
        <Stack ai='center' className={s.tab}>
          <Icon name={w.icon} size={14} />
          <p>{w.name}</p>
          <Button className={s.x} img='X' size='icon' variant='ghost' onClick={() => closeWindow(w.uuid)} />
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

  const openTimeline = () => {
    newWindow({
      icon: 'Edge',
      children: <Timeline />,
      name: 'Timeline'
    })
  }

  return (
    <Stack className={cn(s.window, s.noWindows)} dir='column' jc='center'>
      <h3>Welcome to gULP workspace</h3>
      <p>Choose action below</p>
      <Stack>
        <Button size='lg' img='Upload' variant='secondary' className={s.rounded} onClick={() => spawnBanner(<UploadBanner />)}>Upload file</Button>
        <Button size='lg' img='Edge' className={s.rounded} onClick={openTimeline}>Open timeline</Button>
      </Stack>
      <Button className={s.hint} variant='link' asChild><a href='https://github.com/mentat-is/gulpui-web/blob/master/README.md'>See documentation for more information</a></Button> 
    </Stack>
  )
}