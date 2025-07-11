import React, {
  useState,
  createContext,
  useContext,
  ReactNode,
  useRef,
  useEffect,
  useMemo,
} from 'react'
import { λApp, BaseInfo } from '@/dto'
import { AppSocket, MultiSocket } from '@/class/AppSocket'
import { File, Info } from '@/class/Info';
import '@/class/API'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { toast } from 'sonner'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { SetState } from '@/class/API'
import { Hint } from '@/dialogs/Hint.dialog';

export class ApplicationError extends Error {
  constructor(message: string) {
    super(`Application Error: ${message}`)
  }
}

interface ApplicationContextProps {
  spawnBanner: (banner: React.ReactNode) => void
  destroyBanner: () => void
  banner: React.ReactNode
  spawnDialog: (dialog: React.ReactNode) => void
  dialog: React.ReactNode
  app: λApp
  scrollX: number;
  scrollY: number;
  setScrollX: SetState<number>;
  setScrollY: SetState<number>;
  ws: AppSocket | undefined
  mws: MultiSocket | undefined
  setWs: React.Dispatch<React.SetStateAction<AppSocket | undefined>>
  setInfo: (info: λApp) => void
  Info: Info
  timeline: React.RefObject<HTMLDivElement>
  highlightsOverlay: React.ReactNode,
  setHighlightsOverlay: SetState<React.ReactNode>;
}

export const ApplicationContext = createContext<
  ApplicationContextProps | undefined
>(undefined)

export const useApplication = (): ApplicationContextProps =>
  useContext(ApplicationContext)!

export const ApplicationProvider = ({ children }: { children: ReactNode }) => {
  const [app, setInfo] = useState<λApp>(BaseInfo)
  const [banner, setBanner] = useState<ReactNode>()
  const [dialog, setDialog] = useState<ReactNode>(<Hint.Dialog />)
  const timeline = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const [highlightsOverlay, setHighlightsOverlay] = useState<React.ReactNode>(null);
  const [scrollX, setScrollX] = useState<number>(0)
  const [scrollY, setScrollY] = useState<number>(-26)

  const instance = new Info({ app, setInfo, timeline, setScrollX, setScrollY })

  const [ws, setWs] = useState<AppSocket>()
  const [mws, setMws] = useState<MultiSocket>()

  useEffect(() => {
    if (app.general.token) setWs(new AppSocket(instance))
    if (app.general.token) setMws(new MultiSocket(instance))
  }, [instance, app])

  const spawnBanner = (banner: React.ReactNode) => {
    setBanner(banner)
    document.querySelector('body')?.classList.add('no-scroll')
  }

  const destroyBanner = () => {
    setBanner(() => null)
    document.querySelector('body')?.classList.remove('no-scroll')
  }

  const spawnDialog = (dialog: React.ReactNode) => {
    setDialog(dialog)
  }

  const props: ApplicationContextProps = {
    spawnBanner,
    destroyBanner,
    banner,
    spawnDialog,
    dialog,
    ws,
    mws,
    app,
    scrollX,
    scrollY,
    setScrollX,
    setScrollY,
    setWs,
    setInfo,
    Info: instance,
    timeline,
    highlightsOverlay,
    setHighlightsOverlay
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!app.timeline.target || banner) return;

    const key = event.key.toLowerCase()

    const events = File.events(app, app.timeline.target['gulp.source_id'])

    if (key === 'd' || key === 'a') {
      const delta = Number(key === 'a') ? 1 : -1
      const target = instance.setTimelineTarget(delta)
      if (target) {
        spawnDialog(<DisplayEventDialog event={target} />)
      } else {
        toast(`Cannot open ${delta > 0 ? 'next' : 'previous'} event`)
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
    <ApplicationContext.Provider value={props}>
      {children}
    </ApplicationContext.Provider>
  )
}
