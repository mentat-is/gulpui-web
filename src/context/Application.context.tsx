import React, { useState, createContext, useContext, ReactNode, useRef, useEffect, useMemo } from 'react';
import { λApp, BaseInfo } from '@/dto';
import { AppSocket } from '@/class/AppSocket';
import { Info } from '@/class/Info';
import { Console } from '@impactium/console';
import { Logger } from '@/dto/Logger.class';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import '@/class/API';

export class ApplicationError extends Error {
  constructor(message: string) {
    super(`Application Error: ${message}`);
  }
}

// Define the shape of the application context properties
interface ApplicationContextProps {
  spawnBanner: (banner: JSX.Element) => void;
  destroyBanner: () => void;
  banner: boolean;
  spawnDialog: (dialog: JSX.Element) => void;
  destroyDialog: () => void;
  dialog: boolean;
  app: λApp;
  ws: AppSocket | undefined;
  setWs: React.Dispatch<React.SetStateAction<AppSocket | undefined>>
  setInfo: (info: λApp) => void;
  Info: Info;
  timeline: React.RefObject<HTMLDivElement>;
  logout: () => void;
}

// Create the application context
export const ApplicationContext = createContext<ApplicationContextProps | undefined>(undefined);

// Custom hook to use the application context
export const useApplication = (): ApplicationContextProps => useContext(ApplicationContext)!;

// Application provider component to wrap the application with context
export const ApplicationProvider = ({ children }: { children: ReactNode }) => {
  const [app, setInfo] = useState<λApp>(BaseInfo);
  const [banner, setBanner] = useState<ReactNode>();
  const [dialog, setDialog] = useState<ReactNode>();
  const timeline = useRef<HTMLDivElement>(null);

  const logout = () => {
    api('/logout', {
      method: 'DELETE',
    }).then(() => {
      destroyBanner();
      destroyDialog();
      setInfo(BaseInfo);
    })
  };
  
  const instance = new Info({app, setInfo, timeline});

  const [ws, setWs] = useState<AppSocket>();

  useEffect(() => {
    if (app.general.token) setWs(new AppSocket(instance, app));

  }, [app.general.token])

  const spawnBanner = (banner: JSX.Element) => {
    setBanner(banner);
    document.querySelector('body')?.classList.add('no-scroll');
  }; // Function to place banner into DOM-tree
  
  const destroyBanner = () => {
    setBanner(() => null); 
    document.querySelector('body')?.classList.remove('no-scroll');
  }; // Function to unmount a banner

  
  const spawnDialog = (dialog: JSX.Element) => {
    setDialog(dialog)
  };
  
  const destroyDialog = () => {
    setDialog(() => null)
  };

  // Application context properties
  const props: ApplicationContextProps = {
    spawnBanner,
    destroyBanner,
    banner: !!banner,
    spawnDialog,
    destroyDialog,
    dialog: !!dialog,
    ws,
    app,
    setWs,
    setInfo,
    Info: instance,
    timeline,
    logout
  };

  const handleLoggerExportCommand = () => {
    const content = Logger.history()
      .map(l => l.message.replace(/x1b\[[0-9;]*m/g, ''))
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gulpui-web_log_${Date.now()}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const prefix = useMemo(() => {
    return 'root@Gulp:/web-ui#';
  }, []);

  const onCommand = (cmd: string) => {
    Logger.push(prefix + cmd);
    switch (true) {
      case cmd === 'export':
        handleLoggerExportCommand();
        break;
    
      default:
        Logger.error('Unknown command', Logger.name)
        break;
    }
  }
  
  useEffect(() => {
    if (app.timeline.target) {
      spawnDialog(<DisplayEventDialog event={app.timeline.target} />)
    } else {
      destroyBanner();
    }
  }, [app.timeline.target]);

  return (
    <ApplicationContext.Provider value={props}>
      {children}
      {banner}
      {dialog}
      <Console noise={true} onCommand={onCommand} history={Logger.history()} title='Gulp Web Client' trigger='\' icon={<img style={{filter: `var(--filter-to-white)`, width: 14 }} src='/gulp-no-text.svg' alt='' />} prefix={prefix} />
    </ApplicationContext.Provider>
  );
};
