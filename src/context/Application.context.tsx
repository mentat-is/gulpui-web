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
  ws: AppSocket | undefined
  mws: MultiSocket | undefined
  setWs: React.Dispatch<React.SetStateAction<AppSocket | undefined>>
  setInfo: (info: λApp) => void
  Info: Info
  timeline: React.RefObject<HTMLDivElement>
  logout: () => void
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

  const logout = () => {
    api('/logout', {
      method: 'POST',
      query: {
        ws_id: app.general.ws_id,
      },
    }).then(() => {
      destroyBanner()
      setInfo(BaseInfo)
    })
  }

  const instance = new Info({ app, setInfo, timeline })

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

  const props: ApplicationContextProps = {
    spawnBanner,
    destroyBanner,
    banner,
    spawnDialog,
    dialog,
    ws,
    mws,
    app,
    setWs,
    setInfo,
    Info: instance,
    timeline,
    logout,
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
    if (!app.timeline.target || banner) {
      console.log('Banner is open, prewenting')
      return
    }

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
