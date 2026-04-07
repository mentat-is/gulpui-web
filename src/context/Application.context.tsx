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


function _({ children }: { children: ReactNode }) {
  const [app, setInfo] = useState<App.Type>(App.Base);
  const [banner, setBanner] = useState<ReactNode>()
  const [dialog, setDialog] = useState<ReactNode>(<Hint.Dialog />)
  const timeline = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const [highlightsOverlay, setHighlightsOverlay] = useState<React.ReactNode>(null);

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
    infoRef.current = new Info({ app, setInfo, timeline });
  } else {
    infoRef.current.app = app;
    infoRef.current.setInfo = setInfo;
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

    /**
     * Handles incoming collab update messages (note/link/highlight) from WebSocket.
     * Uses functional setState to guarantee immutable updates and correct React
     * change detection. The old approach mutated the app object in-place and passed
     * the same reference to setInfo(), which could cause React to skip re-renders
     * or trigger stale cascading updates.
     */
    const collabUpdateCallback = (message: any) => {
      switch (message.payload.obj.type) {
        case 'note': {
          const note: Note.Type = message.payload.obj;
          setInfo(prev => {
            const idx = prev.target.notes.findIndex(n => n.id === note.id);
            const newNotes = idx >= 0
              ? prev.target.notes.map((n, i) => i === idx ? note : n)
              : [...prev.target.notes, note];
            return { ...prev, target: { ...prev.target, notes: newNotes } };
          });
          return;
        }
        case 'link': {
          const link: Link.Type = message.payload.obj;
          setInfo(prev => {
            const idx = prev.target.links.findIndex(l => l.id === link.id);
            const newLinks = idx >= 0
              ? prev.target.links.map((l, i) => i === idx ? link : l)
              : [...prev.target.links, link];
            return { ...prev, target: { ...prev.target, links: newLinks } };
          });
          return;
        }
        case 'highlight':
          instanceRef.current.highlights_reload();
          return;
      }
    }

    /**
     * Handles collab delete messages from WebSocket.
     * Uses functional setState to produce an immutable state update.
     * Returns `prev` unchanged if the id matches neither notes nor links,
     * preventing unnecessary re-renders.
     */
    const collabDeleteCallback = (message: any) => {
      const id: Link.Id | Note.Id = message.payload.id;
      setInfo(prev => {
        // Check notes first
        if (prev.target.notes.some(n => n.id === id)) {
          return {
            ...prev,
            target: { ...prev.target, notes: prev.target.notes.filter(n => n.id !== id) }
          };
        }
        // Then check links
        if (prev.target.links.some(l => l.id === id)) {
          return {
            ...prev,
            target: { ...prev.target, links: prev.target.links.filter(l => l.id !== id) }
          };
        }
        // Nothing matched — return same reference so React skips re-render
        return prev;
      });
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
