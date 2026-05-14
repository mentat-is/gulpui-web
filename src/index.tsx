import ReactDOM from 'react-dom/client'
import './global.css'
import { Application } from './context/Application.context'
import { Toaster } from './ui/Toaster'
import { Api } from './class/API'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { Boundary } from './context/Boundary.context'
import { Theme } from './context/Theme.context'
import { Color } from './entities/Color'
import { useTheme } from 'next-themes'
import { RendererTest } from './page/RendererTest.page'
import { DetachedAppProvider } from './context/DetachedApp.provider'
import { DataStore } from './store/DataStore'
import { WindowBridge } from './lib/WindowBridge'
import { Hint } from './dialogs/Hint.dialog'

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
    const inst = Boundary.Provider.instance;
    if (err && inst) {
      inst.showError(err);
    }
  };

  window.onunhandledrejection = function (event) {
    Logger.error("[Unhandled Rejection]", event.reason);
    const inst = Boundary.Provider.instance;
    if (event.reason && inst) {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      inst.showError(error);
    }
  };

  const isRendererTest = window.location.pathname === '/renderer-test';

  return (
    <>
      <Theme.Provider>
        <Toaster />
        <Application.Provider>
          <Boundary.Provider>
            <Extension.Provider>
              {isRendererTest ? <RendererTest.Page /> : <Main />}
            </Extension.Provider>
          </Boundary.Provider>
        </Application.Provider>
      </Theme.Provider>
    </>
  )
}

function Main() {
  const { theme } = useTheme();
  const {
    Info,
    app,
    dialog,
    dialogsDocked,
    hintOpen,
    setHintOpen,
    setDialogsDocked,
    spawnBanner,
  } = Application.use();
  const [isPreloaded, setIsPreloaded] = useState(false);
  const dialogWindowRef = useRef<Window | null>(null);
  const dialogRootRef = useRef<ReactDOM.Root | null>(null);
  const dialogBridgeIdRef = useRef<string | null>(null);

  const applyThemeToWindow = useCallback((sourceDoc: Document, targetDoc: Document, nextTheme: string | undefined) => {
    const sourceRoot = sourceDoc.documentElement;
    const targetRoot = targetDoc.documentElement;

    targetRoot.setAttribute('data-theme', nextTheme ?? 'dark');

    const styles = getComputedStyle(sourceRoot);
    for (let index = 0; index < styles.length; index++) {
      const key = styles[index];
      if (key.startsWith('--')) {
        targetRoot.style.setProperty(key, styles.getPropertyValue(key));
      }
    }
  }, []);

  const copyStylesToWindow = useCallback((targetWindow: Window) => {
    applyThemeToWindow(document, targetWindow.document, theme);

    Array.from(document.styleSheets).forEach((styleSheet: CSSStyleSheet) => {
      try {
        if (styleSheet.href) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          targetWindow.document.head.appendChild(link);
        } else if (styleSheet.cssRules) {
          const style = document.createElement('style');
          Array.from(styleSheet.cssRules).forEach((rule) => {
            style.appendChild(document.createTextNode(rule.cssText));
          });
          targetWindow.document.head.appendChild(style);
        }
      } catch (error) {
        console.warn('error copying style', error);
      }
    });
  }, [applyThemeToWindow, theme]);

  const unmountDialogWindow = useCallback(() => {
    dialogRootRef.current?.unmount();
    dialogRootRef.current = null;
    dialogBridgeIdRef.current = null;
    if (dialogWindowRef.current && !dialogWindowRef.current.closed) {
      dialogWindowRef.current.close();
    }
    dialogWindowRef.current = null;
  }, []);

  const renderDetachedDialog = useCallback((targetWindow: Window) => {
    const container = targetWindow.document.getElementById('detached-root') ?? targetWindow.document.createElement('div');
    if (!container.id) {
      container.id = 'detached-root';
      targetWindow.document.body.innerHTML = '';
      targetWindow.document.body.appendChild(container);
    }

    if (!dialogRootRef.current) {
      dialogRootRef.current = ReactDOM.createRoot(container);
    }

    if (!dialogBridgeIdRef.current) {
      dialogBridgeIdRef.current = WindowBridge.generateId();
    }

    dialogRootRef.current.render(
      <DetachedAppProvider
        initialApp={app}
        initialNotes={[...DataStore.notes]}
        bridgeId={dialogBridgeIdRef.current}
        detachedDocument={targetWindow.document}
        mainSpawnBanner={spawnBanner}
      >
        <DetachedDialogWindowContent dialog={dialog} />
      </DetachedAppProvider>
    );
  }, [app, dialog, spawnBanner]);

  useEffect(() => {
    if (isPreloaded)
      return;

    setTimeout(() => {
      setIsPreloaded(true);
    }, 500);
  }, [isPreloaded]);

  useEffect(() => {
    if (theme) {
      Color.Themer.setTheme();
    }
  }, [theme]);

  useEffect(() => {
    if (dialogWindowRef.current && !dialogWindowRef.current.closed) {
      applyThemeToWindow(document, dialogWindowRef.current.document, theme);
    }
  }, [applyThemeToWindow, theme]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) {
      return Logger.error('ROOT_NOT_FOUND');
    }

    root.classList[app.hidden.toasts ? 'add' : 'remove']('hidden_toats');
  }, [app.hidden.toasts]);

  useEffect(() => {
    return () => {
      unmountDialogWindow();
    };
  }, [unmountDialogWindow]);

  useEffect(() => {
    if (dialogsDocked || !dialog) {
      if (dialogWindowRef.current) {
        unmountDialogWindow();
      }
      return;
    }

    let nextWindow = dialogWindowRef.current;
    if (!nextWindow || nextWindow.closed) {
      nextWindow = window.open('', 'GulpDialogWindow', `width=${Math.max(app.timeline.dialogSize, 480)},height=${Math.max(window.innerHeight - 160, 640)},left=${Math.max(window.innerWidth - Math.max(app.timeline.dialogSize, 480) - 48, 48)},top=60`);
      if (!nextWindow) {
        setDialogsDocked(true);
        return;
      }

      nextWindow.document.title = 'Gulp Event Details';
      copyStylesToWindow(nextWindow);
      dialogWindowRef.current = nextWindow;
      nextWindow.addEventListener('beforeunload', () => {
        dialogRootRef.current?.unmount();
        dialogRootRef.current = null;
        dialogBridgeIdRef.current = null;
        dialogWindowRef.current = null;
        // Do NOT setDialogsDocked(true) here — the user's "undocked" preference
        // should persist. The next event click will re-open the popup automatically.
      }, { once: true });
    }

    renderDetachedDialog(nextWindow);
  }, [app.timeline.dialogSize, copyStylesToWindow, dialogsDocked, renderDetachedDialog, setDialogsDocked, unmountDialogWindow]);

  // Listen for redock requests sent from the detached dialog window
  useEffect(() => {
    const listenId = WindowBridge.generateId();
    const bridge = WindowBridge.create(listenId, (message) => {
      if (message.type === WindowBridge.MessageType.DOCK_DIALOG) {
        setDialogsDocked(true);
      }
    });
    return () => bridge.destroy();
  }, [setDialogsDocked]);

  // When dock state changes the canvas layout shifts; trigger a canvas redraw after layout settles
  useEffect(() => {
    const id = requestAnimationFrame(() => { DataStore.markDirty(); });
    return () => cancelAnimationFrame(id);
  }, [dialogsDocked]);

  if (!isPreloaded) {
    return <Preloader />
  }

  const showTimeline = Info.app.target.files.filter(f => f.selected).length || Info.app.general.skippedAuth;

  return showTimeline ? (
    <Stack gap={12} className={s.window} ai='stretch'>
      <Menu />
      <Timeline />
      {hintOpen ? <Hint.Dialog onClose={() => setHintOpen(false)} /> : null}
      {dialogsDocked && dialog ? (
        <Stack
          className={cn(s.dialog)}
          style={{ width: app.timeline.dialogSize }}
          pos="relative"
        >
          <Resizer init={app.timeline.dialogSize} set={Info.setDialogSize} />
          {dialog}
        </Stack>
      ) : null}
    </Stack>
  ) : <Auth.Page />
}

function DetachedDialogWindowContent({ dialog }: { dialog: React.ReactNode }) {
  const { dialog: detachedDialog, spawnDialog } = Application.use();

  useEffect(() => {
    spawnDialog(dialog);
  }, [dialog, spawnDialog]);

  return detachedDialog ?? null;
}
