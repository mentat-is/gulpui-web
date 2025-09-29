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
  const [scrollX, setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(-26);

  const instance = new Info({ app, setInfo, timeline, scrollX, scrollY, setScrollX, setScrollY });

  const ws = useMemo(() => {
    if (!app.general.user) {
      return;
    }

    return new SmartSocket.Class(app.general.server + '/ws', app.general.user.token, app.general.ws_id);
  }, [app.general]);

  useEffect(() => {
    if (!SmartSocket.Class.instance)
      return;

    const collabCallback = (message: any) => {
      switch (message.data.type) {
        case 'note':
          const notes: Note.Type[] = message.data.data;
          notes.forEach(note => {
            const exist = message.data.created ? -2 : app.target.notes.findIndex(n => n.id === note.id);
            if (exist >= 0) {
              app.target.notes[exist] = note;
              app.target.notes = [...app.target.notes];
            } else {
              app.target.notes = [...app.target.notes, note];
            }
          });
          setInfo(app);
          return;
        case 'link':
          const links: Link.Type[] = message.data.data;
          links.forEach(link => {
            const exist = message.data.created === true ? -2 : app.target.links.findIndex(n => n.id === link.id);
            if (exist >= 0) {
              app.target.links[exist] = link;
              app.target.links = [...app.target.links];
            } else {
              app.target.links = [...app.target.links, link];
            }
          });
          setInfo(app);
          return;
      }
      instance.highlights_reload();
    }

    const reqeustStatsCallback = (message: any) => instance.request_add(message.data.data);

    SmartSocket.Class.instance.on(SmartSocket.Message.Type.COLLAB_UPDATE, collabCallback);
    SmartSocket.Class.instance.on(SmartSocket.Message.Type.COLLAB_DELETE, collabCallback);
    const sid = SmartSocket.Class.instance.con(SmartSocket.Message.Type.STATS_UPDATE, m => m.data.data.type === 'request_stats', reqeustStatsCallback);

    return () => {
      SmartSocket.Class.instance.off(SmartSocket.Message.Type.COLLAB_UPDATE, collabCallback);
      SmartSocket.Class.instance.off(SmartSocket.Message.Type.COLLAB_DELETE, collabCallback);
      SmartSocket.Class.instance.coff(SmartSocket.Message.Type.STATS_UPDATE, sid);
    }
  }, [ws, app, instance]);

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

    const events = Source.Entity.events(app, app.timeline.target['gulp.source_id'])

    if (key === 'd' || key === 'a') {
      const delta = Number(key === 'a') ? 1 : -1
      const target = instance.setTimelineTarget(delta)
      if (target) {
        spawnDialog(<DisplayEventDialog event={target} />)
      } else {
        toast(`Cannot open ${delta > 0 ? 'previous' : 'next'} event`)
      }
    } else if (key === 'end') {
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
