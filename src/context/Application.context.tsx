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
import { File, Info } from '@/class/Info'
// import { Console } from '@impactium/console'
import { Logger } from '@/dto/Logger.class'
import '@/class/API'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { toast } from 'sonner'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { SetState } from '@/class/API'

export class ApplicationError extends Error {
  constructor(message: string) {
    super(`Application Error: ${message}`)
  }
}

interface ApplicationContextProps {
  spawnBanner: (banner: JSX.Element) => void
  destroyBanner: () => void
  banner: React.ReactNode
  spawnDialog: (dialog: JSX.Element) => void
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
}

export const ApplicationContext = createContext<
  ApplicationContextProps | undefined
>(undefined)

export const useApplication = (): ApplicationContextProps =>
  useContext(ApplicationContext)!

export const ApplicationProvider = ({ children }: { children: ReactNode }) => {
  const [app, setInfo] = useState<λApp>(BaseInfo)
  const [banner, setBanner] = useState<ReactNode>()
  const [dialog, setDialog] = useState<ReactNode>(<DisplayGroupDialog events={[]} />)
  const timeline = useRef<HTMLDivElement>(null)
  const [scrollX, setScrollX] = useState<number>(0)
  const [scrollY, setScrollY] = useState<number>(-26)

  const instance = new Info({ app, setInfo, timeline, setScrollX, setScrollY })

  const [ws, setWs] = useState<AppSocket>()
  const [mws, setMws] = useState<MultiSocket>()

  useEffect(() => {
    if (app.general.token) setWs(new AppSocket(instance))
    if (app.general.token) setMws(new MultiSocket(instance))
  }, [instance, app])

  const spawnBanner = (banner: JSX.Element) => {
    setBanner(banner)
    document.querySelector('body')?.classList.add('no-scroll')
  }

  const destroyBanner = () => {
    setBanner(() => null)
    document.querySelector('body')?.classList.remove('no-scroll')
  }

  const spawnDialog = (dialog: JSX.Element) => {
    setDialog(dialog)
  }

  useEffect(() => {
    console.log(scrollX, app.timeline.scale, app.timeline.frame);
  }, [scrollX]);

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
    timeline
  }

  const handleLoggerExportCommand = () => {
    const content = Logger.history()
      .map((l) => l.message.replace(/x1b\[[0-9;]*m/g, ''))
      .join('\n')
    const blob = new Blob([content], { type: 'text/plain' })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gulpui-web_log_${Date.now()}.log`
    link.click()
    URL.revokeObjectURL(url)
  }

  const prefix = useMemo(() => {
    return 'root@Gulp:/web-ui#'
  }, [])

  const onCommand = (cmd: string) => {
    Logger.push(prefix + cmd)
    switch (true) {
      case cmd === 'export':
        handleLoggerExportCommand()
        break

      default:
        Logger.error('Unknown command', Logger.name)
        break
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!app.timeline.target || banner) return;

    const key = event.key.toLowerCase()

    const events = File.events(app, app.timeline.target.file_id)

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
      {banner}
      {/* <Console
        noise={true}
        onCommand={onCommand}
        history={Logger.history()}
        title="Gulp Web Client"
        trigger="\"
        icon={
          <img
            style={{ filter: `var(--filter-to-white)`, width: 14 }}
            src="/gulp-no-text.svg"
            alt=""
          />
        }
        prefix={prefix}
      /> */}
    </ApplicationContext.Provider>
  )
}
