import { useState, createContext, useContext, ReactNode, useRef, useEffect, useMemo } from 'react';
import { Info } from '@/class/Info';
import '@/class/API'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { toast } from 'sonner'
import { SetState } from '@/class/API'
import { Hint } from '@/dialogs/Hint.dialog';
import { SmartSocket } from '@/class/SmartSocket';
import { Note } from '@/entities/Note';
import { Link } from '@/entities/Link';
import { Source } from '@/entities/Source';
import { App } from '@/entities/App';
import { Refractor } from '@/ui/utils';

function _({ children }: { children: ReactNode }) {
  const [app, setInfo] = useState<App.Type>(App.Base);
  const [banner, setBanner] = useState<ReactNode>()
  const [dialog, setDialog] = useState<ReactNode>(<Hint.Dialog />)
  const timeline = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const [highlightsOverlay, setHighlightsOverlay] = useState<React.ReactNode>(null);
  const [scrollX, setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(-26);

  /**
   * STABLE INFO INSTANCE: Info is stored in a ref and updated in-place
   * instead of being recreated on every render with `new Info(...)`.
   *
   * ARCHITECTURAL DECISION: Previously, `const instance = new Info(...)` ran on
   * every render of the root Provider — every state change anywhere in the app
   * created a new Info object. Since `instance` was in the WS useEffect deps,
   * this also caused WS listeners to be re-registered on every render.
   * Using useRef avoids this: the instance is created once, and only its
   * mutable props (app, setInfo, scrollX, etc.) are updated each render.
   */
  const infoRef = useRef<Info | null>(null);
  if (!infoRef.current) {
    infoRef.current = new Info({ app, setInfo, timeline, scrollX, scrollY, setScrollX, setScrollY });
  } else {
    infoRef.current.app = app;
    infoRef.current.setInfo = setInfo;
    infoRef.current.scrollX = scrollX;
    infoRef.current.scrollY = scrollY;
    infoRef.current.setScrollX = setScrollX;
    infoRef.current.setScrollY = setScrollY;
  }
  const instance = infoRef.current;

  /**
   * STABLE REFS FOR WS CALLBACKS: These refs hold the latest `app` and `instance`
   * without being useEffect dependencies. The WS callbacks read `.current` at call
   * time, ensuring they always access fresh state while the effect itself only
   * re-runs when the WebSocket connection changes (deps: [ws]).
   *
   * Without this pattern, `[ws, app, instance]` as deps caused the WS listeners
   * to be unregistered and re-registered on every single state update in the entire app.
   */
  const appRef = useRef(app);
  appRef.current = app;
  const instanceRef = useRef(instance);
  instanceRef.current = instance;

  const ws = useMemo(() => {
    if (!app.general.user) {
      return;
    }

    return new SmartSocket.Class(app.general.ws_id);
  }, [app.general, app.general.server, app.general.ws_id, app.general.user]);

  useEffect(() => {
    if (!SmartSocket.Class.instance)
      return;

    const collabUpdateCallback = (message: any) => {
      const currentApp = appRef.current;
      switch (message.payload.obj.type) {
        case 'note':
          const note: Note.Type = message.payload.obj;

          const isExistingNote = currentApp.target.notes.findIndex(n => n.id === note.id);
          if (isExistingNote >= 0) {
            currentApp.target.notes[isExistingNote] = note;
            currentApp.target.notes = [...currentApp.target.notes];
          } else {
            currentApp.target.notes = [...currentApp.target.notes, note];
          }

          setInfo(currentApp);
          return;
        case 'link':
          const link: Link.Type = message.payload.obj;

          const isExistingLink = currentApp.target.links.findIndex(n => n.id === link.id);
          if (isExistingLink >= 0) {
            currentApp.target.links[isExistingLink] = link;
            currentApp.target.links = [...currentApp.target.links];
          } else {
            currentApp.target.links = [...currentApp.target.links, link];
          }

          setInfo(currentApp);
          return;
        case 'highlight':
          instanceRef.current.highlights_reload();
          return;
      }
    }

    const collabDeleteCallback = (message: any) => {
      const currentApp = appRef.current;
      const id: Link.Id | Note.Id = message.payload.id;
      switch (true) {
        case currentApp.target.notes.some(n => n.id === id):
          currentApp.target.notes = Refractor.array(...currentApp.target.notes.filter(n => n.id !== id));

          setInfo(currentApp);
          return;
        case currentApp.target.links.some(l => l.id === id):
          currentApp.target.links = Refractor.array(...currentApp.target.links.filter(l => l.id !== id));

          setInfo(currentApp);
          return;
      }
    }

    const reqeustStatsCallback = (message: any) => instanceRef.current.request_add(message.payload.obj);

    SmartSocket.Class.instance.on(SmartSocket.Message.Type.COLLAB_UPDATE, collabUpdateCallback);
    SmartSocket.Class.instance.on(SmartSocket.Message.Type.COLLAB_DELETE, collabDeleteCallback);
    const sid = SmartSocket.Class.instance.con(SmartSocket.Message.Type.STATS_UPDATE, m => m.payload.obj.type === 'request_stats', reqeustStatsCallback);

    return () => {
      SmartSocket.Class.instance.off(SmartSocket.Message.Type.COLLAB_UPDATE, collabUpdateCallback);
      SmartSocket.Class.instance.off(SmartSocket.Message.Type.COLLAB_DELETE, collabDeleteCallback);
      SmartSocket.Class.instance.coff(SmartSocket.Message.Type.STATS_UPDATE, sid);
    }
  }, [ws]);

  const spawnBanner = (banner: React.ReactNode) => {
    setBanner(banner)
    document.querySelector('body')?.classList.add('no-scroll')
  }

  // @ts-ignore
  window.spawnBanner = spawnBanner;

  const destroyBanner = () => {
    setBanner(() => null)
    document.querySelector('body')?.classList.remove('no-scroll')
  }

  const spawnDialog = (dialog: React.ReactNode) => {
    setDialog(dialog)
  }

  const props = {
    spawnBanner,
    destroyBanner,
    banner,
    spawnDialog,
    dialog,
    app,
    scrollX,
    scrollY,
    setScrollX,
    setScrollY,
    setInfo,
    Info: instance,
    timeline,
    highlightsOverlay,
    setHighlightsOverlay
  } satisfies Application.Context.Props;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!app.timeline.target || banner) return;

    const key = event.key.toLowerCase()

    // check for input etc... 
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || target.isContentEditable) return;

    const events = Source.Entity.events(app, app.timeline.target['gulp.source_id'])

    if (['d', 'a', 'arrowright', 'arrowleft'].includes(key)) {
      const delta = (key === 'a' || key === 'arrowleft') ? 1 : -1
      const target = instance.setTimelineTarget(delta)
      if (target) {
        spawnDialog(<DisplayEventDialog event={target} />)
      } else {
        toast(`Cannot open ${delta > 0 ? 'previous' : 'next'} event`)
      }
    } else if (['ф', 'а'].includes(key)) {
      toast('Use English letters A and D for scrolling');
    }
    else if (key === 'end') {
      event.preventDefault()
      const target = instance.setTimelineTarget(events[0])
      spawnDialog(<DisplayEventDialog event={target} />)
    } else if (key === 'home') {
      event.preventDefault()
      const target = instance.setTimelineTarget(events[events.length - 1])
      spawnDialog(<DisplayEventDialog event={target} />)
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as any)

    return () => {
      window.removeEventListener('keydown', handleKeyDown as any)
    }
  }, [dialog, app.timeline.target, banner])

  return (
    <Application.Context.Provider value={props}>
      {children}
    </Application.Context.Provider>
  )
}

export namespace Application {
  export namespace Context {
    export interface Props {
      spawnBanner: (banner: React.ReactNode) => void
      destroyBanner: () => void
      banner: React.ReactNode
      spawnDialog: (dialog: React.ReactNode) => void
      dialog: React.ReactNode
      app: App.Type
      scrollX: number;
      scrollY: number;
      setScrollX: SetState<number>;
      setScrollY: SetState<number>;
      setInfo: (info: App.Type) => void
      Info: Info
      timeline: React.RefObject<HTMLDivElement>
      highlightsOverlay: React.ReactNode,
      setHighlightsOverlay: SetState<React.ReactNode>;
    }
  }

  export const Context = createContext<Application.Context.Props>(null!);

  export const use = (): Application.Context.Props => useContext(Application.Context);

  export const Provider = _;
}
