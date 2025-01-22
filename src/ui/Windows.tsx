import { File, Index, Operation, μ } from '@/class/Info';
import { Button, Stack, Loading } from '@impactium/components';
import React, { useState, createContext, useContext, useCallback, memo, useEffect } from 'react';
import { cn, generateUUID } from './utils';
import { Timeline } from '@/app/gulp/components/body/Timeline';
import s from './styles/Windows.module.css';
import { Icon } from '@impactium/icons';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { UploadBanner } from '@/banners/Upload.banner';
import { useApplication } from '@/context/Application.context';
import { MenuDialog } from '@/app/gulp/components/header/Menu.dialog';
import { AuthBanner } from '@/banners/Auth.banner';
import { LimitsBanner } from '@/banners/Limits.banner';
import { OperationBanner } from '@/banners/Operation.banner';
import { SelectFilesBanner } from '@/banners/SelectFiles.banner';
import { Separator } from './Separator';
import { Glyph } from './Glyph';

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
  const { spawnBanner, Info } = useApplication();

  const [loading, setLoading] = useState<boolean>(false);

  const openTimeline = () => {
    setLoading(true);

    setTimeout(() => {
      newWindow({
        icon: 'Edge',
        children: <Timeline />,
        name: 'Timeline'
      });
    }, 1000);
  }

  const OpenTimelineButton = useCallback(() => {
    switch (true) {
      case !Info.User.isAuthorized(): 
        return <Button loading={loading} size='lg' img='LogIn' className={s.rounded} onClick={() => spawnBanner(<AuthBanner />)}>Log In</Button>;

      case !Operation.selected(Info.app):
        return <Button loading={loading} size='lg' img='Status' className={s.rounded} onClick={() => spawnBanner(<OperationBanner />)}>Select Operation</Button>;

      case File.selected(Info.app).length === 0:
        return <Button loading={loading} size='lg' img='FileBox' className={s.rounded} onClick={() => spawnBanner(<SelectFilesBanner />)}>Select documents</Button>;

      case Info.app.timeline.frame.max === 0:
        return <Button loading={loading} size='lg' img='AlignHorizontalSpaceAround' className={s.rounded} onClick={() => spawnBanner(<LimitsBanner />)}>Select frame</Button>;

      default:
        return <Button loading={loading} size='lg' img='Edge' className={s.rounded} onClick={openTimeline}>Open timeline</Button>;
    }
  }, [Info, loading]);

  return (
    <Stack className={cn(s.window, s.noWindows)} dir='column' jc='center'>
      <h3>Welcome to gULP workspace</h3>
      <p>Choose action below</p>
      <Stack>
        <Button size='lg' img='Upload' variant='secondary' className={s.rounded} onClick={() => spawnBanner(<UploadBanner />)}>Upload file</Button>
        <OpenTimelineButton />
      </Stack>
      <Flow />
      <Button className={s.hint} variant='link' asChild><a href='https://github.com/mentat-is/gulpui-web/blob/master/README.md'>See documentation for more information</a></Button> 
    </Stack>
  )
}

namespace Flow {
  export interface Step {
    name: string,
    cond: boolean,
    icon?: Icon.Name,
    loading?: boolean
  }
}

const Flow = () => {
  const { Info } = useApplication();

  const obj: Flow.Step[] = [
    {
      name: 'Authorized',
      cond: Info.User.isAuthorized()
    },
    {
      name: 'Index selected',
      cond: Boolean(Index.selected(Info.app))
    },
    {
      name: 'At least one operation',
      cond: Info.app.target.contexts.length > 0
    },
    {
      name: 'Operation selected',
      cond: Boolean(Operation.selected(Info.app))
    },
    {
      name: 'At least one context',
      cond: Info.app.target.contexts.length > 0
    },
    {
      name: 'At least one file',
      cond: Info.app.target.files.length > 0
    },
    {
      name: 'Files selected',
      cond: File.selected(Info.app).length > 0
    },
    {
      name: 'Frame selected',
      cond: Info.app.timeline.frame.max > 0
    },
    {
      name: 'Glyphs syncronized',
      cond: Info.app.general.glyphs_syncronized,
      loading: Glyph.List.size < Glyph.Raw.length
    }
  ]

  useEffect(() => {
    if (Info.app.general.glyphs_syncronized)
      return;

    if (Info.User.isAuthorized()) {
      Info.glyphs_reload();
    }
  }, [Info.app.general]);

  return (
    <Stack className={s.flow} dir='column' ai='flex-start'>
      {obj.map(Step)}
      <Separator />
      <Step name='Gulp ready' icon='Lambda' cond={obj.every(o => o.cond)} />
    </Stack>
  )
}

const Step = ({ name, cond, icon, loading: _loading }: Flow.Step) => {
  const [loading, setLoading] = useState(_loading);
  const [resolvedCond, setResolvedCond] = useState(cond);

  useEffect(() => {
    if (resolvedCond !== cond) {
      setLoading(true);
      const timer = setTimeout(() => {
        setResolvedCond(cond);
        setLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [cond, resolvedCond]);

  const Image = loading ? (
    <Loading variant="dimmed" size="icon" />
  ) : (
    <Icon
      name={icon || (resolvedCond ? 'CheckCircleFill' : 'CheckCircle')}
      size={12}
    />
  );

  return (
    <p key={name} className={cn(resolvedCond && s.check)}>
      {Image}
      {name}
    </p>
  );
};
