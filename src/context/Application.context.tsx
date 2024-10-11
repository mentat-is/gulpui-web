import React, { useState, createContext, useContext, ReactNode, useRef } from "react";
import { ResponseBase } from "@/dto/ResponseBase.dto";
import { λApp, BaseInfo, λ } from '@/dto';
import { Api } from "@/dto/api.dto";
import { toast } from "sonner";
import { AppSocket } from "@/class/AppSocket";
import { Index, Info } from "@/class/Info";
import Cookies from "universal-cookie";
import { parseTokensFromCookies } from "@/ui/utils";

export class ApplicationError extends Error {
  constructor(message: string) {
    super(`Application Error: ${message}`);
  }
}

// Define the shape of the application context properties
interface ApplicationContextProps {
  spawnBanner: (banner: ReactNode) => void;
  destroyBanner: () => void;
  banner: boolean;
  spawnDialog: (dialog: JSX.Element) => void;
  destroyDialog: () => void;
  dialog: boolean;
  api: Api;
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
  const cookie = new Cookies();
  const [app, setInfo] = useState<λApp>(BaseInfo);
  const [banner, setBanner] = useState<ReactNode>();
  const [dialog, setDialog] = useState<ReactNode>();
  const timeline = useRef<HTMLDivElement>(null);

  const api: Api = async <T extends ResponseBase>(
    path: RequestInfo | URL,
    options: RequestInit & {
      server?: string;
      token?: string;
      isRaw?: boolean;
      isText?: boolean;
      data?: { [key: string]: any };
    } = {}
  ): Promise<λ<T>> => {
    options.data = options.data || {};
    // Include token in request data if available
    if (options.token || app.general.token) options.headers = {
      ...options.headers,
      token: options.token! || app.general.token!
    };

    const index = Index.selected(app);
    // Include index in request data if available
    if (index) options.data.index = index.name;
  
    if (options.data) {
      const requestData = new URLSearchParams(options.data).toString();
      instance.setUpstream(new Blob([requestData]).size);
      path = `${path}?${requestData}`;
    }
  
    const requestOptions: RequestInit = {
      method: 'GET',
      ...options,
    };
  
    const res = await fetch((options.server || app.general.server) + path, requestOptions).catch(error => {
      console.error('[ API | ERROR ]: ', error);
      toast(`Internal appliction error in ${(options.server || app.general.server)}`, {
        description: error
      });
      return null;
    });

    if (!res) {
      
      return new λ();
    }
    
    const lambda = new λ(await res.json() as T)
    if (!res.ok && lambda.isError()) {
      if ((lambda.data.exception.name === 'SessionExpired' || lambda.data.exception.msg.startsWith('session token')) && app.general.token) {
        removeToken();
        setInfo(BaseInfo);
        toast(lambda.data.exception.name, {
          description: lambda.data.exception.msg
        })
      }
    }
    const responseSize = parseInt(res.headers.get('content-length') || '0', 10);
    instance.setDownstream(responseSize);
    return lambda;
  };

  const removeToken = () => cookie.set('sessions', parseTokensFromCookies(cookie.get('sessions')).filter(session => session.token !== app.general.token))

  const logout = () => {
    api('/logout', {
      method: 'DELETE',
    }).then(() => {
      removeToken();
      destroyBanner();
      destroyDialog();
      setInfo(BaseInfo);
    })
  };
  
  const instance = new Info({app, setInfo, api, timeline});

  const [ws, setWs] = useState<AppSocket>();

  const spawnBanner = (banner: ReactNode) => {
    setBanner(banner);
    document.querySelector('body')?.classList.add('no-scroll');
  }; // Function to place banner into DOM-tree
  
  const destroyBanner = () => {
    setBanner(() => null); 
    document.querySelector('body')?.classList.remove('no-scroll');
  }; // Function to unmount a banner

  
  const spawnDialog = (dialog: JSX.Element) => setDialog(dialog);
  
  const destroyDialog = () => setDialog(() => null);

  // Application context properties
  const props: ApplicationContextProps = {
    spawnBanner,
    destroyBanner,
    banner: !!banner,
    spawnDialog,
    destroyDialog,
    dialog: !!dialog,
    ws,
    api,
    app,
    setWs,
    setInfo,
    Info: instance,
    timeline,
    logout
  };

  return (
    <ApplicationContext.Provider value={props}>
      {children}
      {banner}
      {dialog}
    </ApplicationContext.Provider>
  );
};
