import ReactDOM from 'react-dom/client'
import './global.css'
import { Application } from './context/Application.context'
import { Toaster } from './ui/Toaster'
import { Api } from './class/API'
import { useEffect, useState } from 'react'
import { cn } from '@impactium/utils'
import { Extension } from './context/Extension.context'
import { Logger } from './dto/Logger.class'
import { Preloader } from './components/Preloader'
import s from './App.module.css';
import { Stack } from '@/ui/Stack'
import { Menu } from './components/menu'
import { Timeline } from './app/body/Timeline'
import { Resizer } from './ui/Resizer'
import { Auth } from './page/Auth.page'
import { AppErrorBoundary } from './components/ErrorBoundary/AppErrorBoundary'
import { Theme } from './context/Theme.context'
import { Color } from './entities/Color'
import { useTheme } from 'next-themes'

const root = document.getElementById('root')

ReactDOM.createRoot(root!).render(Root())

declare global {
  var api: Api
}

function Root() {
  if (window.onerror) {
    window.onerror = function (...props) {
      Logger.error('[Global Error]', props.join('\n'));
    };
  }

  window.onerror = function (msg: any, src, line, col, err) {
    Logger.error("[Global Error]", msg);
    if (err && AppErrorBoundary.instance) {
      AppErrorBoundary.instance.showError(err);
    }
  };

  window.onunhandledrejection = function (event) {
    Logger.error("[Unhandled Rejection]", event.reason);
    if (event.reason && AppErrorBoundary.instance) {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      AppErrorBoundary.instance.showError(error);
    }
  };

  return (
    <>
      <Theme.Provider>
        <Toaster />
        <Application.Provider>
          <AppErrorBoundary>
            <Extension.Provider>
              <Main />
            </Extension.Provider>
          </AppErrorBoundary>
        </Application.Provider>
      </Theme.Provider>
    </>
  )
}

function Main() {
  const { theme } = useTheme();
  const { Info, app, dialog } = Application.use();
  const [isPreloaded, setIsPreloaded] = useState(false);

  // custom errors

  function Component() {
    const obj: any = null;
    return <div>{obj.prop}</div>;
  }

  useEffect(() => {
    if (isPreloaded)
      return;

    setTimeout(() => {
      setIsPreloaded(true);
    }, 2500);
  }, [isPreloaded]);

  useEffect(() => {
    Color.Themer.setTheme(theme ?? 'dark');
  }, []);

  if (!isPreloaded) {
    return <Preloader />
  }

  return Info.app.target.files.filter(file => file.selected).length ? (
    <Stack gap={12} className={s.window} ai='stretch'>
      <Menu />
      <Timeline />
      <Stack
        className={cn(s.dialog)}
        style={{ width: app.timeline.dialogSize }}
        pos="relative"
      >
        <Resizer init={app.timeline.dialogSize} set={Info.setDialogSize} />
        {dialog}
      </Stack>
    </Stack>
  ) : <Auth.Page />
}
