import { File, Index, Operation as GulpOperationEntity, μ } from '@/class/Info';
import { Button, Loading, Stack } from '@impactium/components';
import React, { useState, createContext, useContext, useCallback, memo, useEffect, useMemo, useRef } from 'react';
import { generateUUID } from './utils';
import { Timeline } from '@/app/gulp/components/body/Timeline';
import s from './styles/Windows.module.css';
import { Icon } from '@impactium/icons';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { UploadBanner } from '@/banners/Upload.banner';
import { useApplication } from '@/context/Application.context';
import { Menu } from '@/app/gulp/components/header/Menu.dialog';
import { AuthBanner } from '@/banners/Auth.banner';
import { LimitsBanner } from '@/banners/Limits.banner';
import { Operation } from '@/banners/Operation.banner';
import { SelectFiles } from '@/banners/SelectFiles.banner';
import { Separator } from './Separator';
import { Glyph } from './Glyph';
import { Default } from '@/dto/Dataset';
import { IndexBanner } from '@/banners/Index.banner';
import { cn } from '@impactium/utils';
import { Resizer } from './Resizer';

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
    const { dialog, app, Info } = useApplication();
    const active = Windows.λWindow.active(windows);

    if (!active) {
      return <NoWindows />;
    }

    const { children, uuid, className, ...props } = active;

    return <Stack key={uuid} gap={12} className={cn(s.window, className)} {...props}>
      <Menu />
      {children}
      <Stack className={cn(s.dialog, dialog && s.open)} style={{ width: app.timeline.dialogSize }} pos='relative'>
        <Resizer init={app.timeline.dialogSize} set={Info.setDialogSize} />
        {dialog}
      </Stack>
    </Stack>;
  });



  export const Provider = () => {
    const [windows, setWindows] = useState<Windows.Window[]>([]);

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
        <ActiveWindow windows={windows} />
      </Windows.Context.Provider>
    );
  };
}

export const λWindow = Windows.λWindow;

export const useWindows = (): Windows.Props => useContext(Windows.Context)!;

const NoWindows = () => {
  const { newWindow, setWindows } = useWindows();
  const { spawnBanner, destroyDialog, Info } = useApplication();

  const [loading, setLoading] = useState<boolean>(false);

  const openTimeline = () => {
    setLoading(true);

    setTimeout(() => {
      newWindow({
        icon: 'Edge',
        children: <Timeline />,
        name: 'Timeline'
      });
    }, 330);
  }

  const ActionButtonConstructor = (text: string, img: Icon.Name, banner: JSX.Element, processing?: boolean) => {
    return <Button loading={processing || loading} disabled={processing} variant='glass' size='lg' img={img} rounded className={s.action} onClick={() => spawnBanner(banner)}>{text}</Button>
  }

  const ActionButton = () => {
    if (flow.every(e => e.cond)) {
      return (
        <Button className={s.action} loading={loading} size='lg' img='Lambda' variant='glass' rounded onClick={openTimeline}>Open gULP</Button>
      )
    }

    const el = flow.find(e => e.cond === false);
    if (!el) {
      return null;
    }

    return el.trigger
  }

  const flow: Flow.Step[] = [
    {
      name: 'Authorized',
      cond: Info.User.isAuthorized(),
      trigger: ActionButtonConstructor('Log In', 'LogIn', <AuthBanner />)
    },
    {
      name: 'Index selected',
      cond: Boolean(Index.selected(Info.app)),
      trigger: ActionButtonConstructor('Select Index', Default.Icon.INDEX, <IndexBanner />)
    },
    {
      name: 'At least one operation',
      cond: Info.app.target.contexts.length > 0,
      trigger: ActionButtonConstructor('Create Operation', Default.Icon.CREATE_OPERATION, <Operation.Create.Banner />)
    },
    {
      name: 'Operation selected',
      cond: Boolean(GulpOperationEntity.selected(Info.app)),
      trigger: ActionButtonConstructor('Select Operation', Default.Icon.OPERATION, <Operation.Select.Banner />)
    },
    {
      name: 'At least one context',
      cond: Info.app.target.contexts.length > 0,
      trigger: ActionButtonConstructor('Create context', Default.Icon.CONTEXT, <UploadBanner />)
    },
    {
      name: 'At least one file',
      cond: Info.app.target.files.length > 0,
      trigger: ActionButtonConstructor('Upload files', 'Upload', <UploadBanner />)
    },
    {
      name: 'Sources selected',
      cond: File.selected(Info.app).length > 0,
      trigger: ActionButtonConstructor('Select sources', Default.Icon.FILE, <SelectFiles.Banner />)
    },
    {
      name: 'Timeframe selected',
      cond: Info.app.timeline.frame.max > 0,
      trigger: ActionButtonConstructor('Choose workflow frame', 'TableColumnsSplit', <LimitsBanner />)
    },
    {
      name: 'Glyphs syncronized',
      cond: Info.app.general.glyphs_syncronized,
      loading: Glyph.List.size < Glyph.Raw.length,
      trigger: ActionButtonConstructor('Glyphs syncing', 'Loader', <></>, true)
    }
  ]

  const backToOperations = () => {
    destroyDialog();
    setWindows([]);
    spawnBanner(<Operation.Select.Banner />);
  }

  return (
    <Stack className={cn(s.window, s.noWindows)} dir='column' jc='center'>
      <h3>Welcome to gULP workspace</h3>
      <p>Choose action below</p>
      <ActionButton />
      <Flow flow={flow} />
      <Stack>
        <Button img={Default.Icon.CREATE_OPERATION} variant='outline' onClick={() => spawnBanner(<Operation.Create.Banner />)}>Create Operation</Button>
        <Button img='Upload' variant='outline' onClick={() => spawnBanner(<UploadBanner />)}>Upload file</Button>
      </Stack>
      <Button style={{ width: 285 }} img='Undo2' variant='outline' onClick={backToOperations}>Back to operations</Button>
      <Button className={s.hint} variant='link' asChild><a href='https://github.com/mentat-is/gulpui-web/blob/master/README.md'>See documentation for more information</a></Button>
      <img src='/mentat.png' className={s.logo} />
    </Stack>
  )
}

namespace Flow {
  export interface Step {
    name: string,
    cond: boolean,
    trigger: JSX.Element;
    icon?: Icon.Name,
    loading?: boolean
  }

  export interface Props {
    flow: Step[]
  }
}

const Flow = ({ flow }: Flow.Props) => {
  const { Info } = useApplication();

  useEffect(() => {
    if (Info.app.general.glyphs_syncronized)
      return;

    if (Info.User.isAuthorized()) {
      Info.glyphs_reload();
    }
  }, [Info.app.general]);

  return (
    <Stack className={s.flow} dir='column' ai='flex-start'>
      {flow.map(Step)}
      <Separator />
      <Step name='Gulp ready' icon='Lambda' cond={flow.every(o => o.cond)} trigger={<></>} />
    </Stack>
  )
}

const Step = ({ name, cond, icon, loading: _loading, trigger }: Flow.Step) => {
  const { spawnBanner } = useApplication();
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
      onClick={() => cond ? void 0 : spawnBanner(trigger)}
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
