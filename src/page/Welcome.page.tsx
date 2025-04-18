import { useEffect, useState } from 'react'
import { Badge, Button, Spinner, Stack } from '@impactium/components'
import s from './styles/WelcomePage.module.css'
import { useWindows } from '../ui/Windows'
import { Icon } from '@impactium/icons'
import { cn } from '@impactium/utils'
import { Separator } from '@radix-ui/react-separator'
import { Timeline } from '../app/gulp/components/body/Timeline'
import { AuthBanner } from '../banners/Auth.banner'
import { LimitsBanner } from '../banners/Limits.banner'
import { SelectFiles } from '../banners/SelectFiles.banner'
import { Settings } from '../banners/Settings.banner'
import { UploadBanner } from '../banners/Upload.banner'
import { useApplication } from '../context/Application.context'
import { Default } from '../dto/Dataset'
import { Glyph } from '../ui/Glyph'
import { Operation } from '../banners/Operation.banner'
import { File, Operation as GulpOperationEntity } from '../class/Info'

export namespace Welcome {
  export function Page({ ...props }: Stack.Props) {
    const { newWindow, setWindows } = useWindows()
    const { spawnBanner, Info } = useApplication()

    const [loading, setLoading] = useState<boolean>(false)

    const openTimeline = () => {
      setLoading(true)

      setTimeout(() => {
        newWindow({
          icon: 'Edge',
          children: <Timeline />,
          name: 'Timeline',
        })
      }, 330)
    }

    const ActionButtonConstructor = (
      text: string,
      img: Icon.Name,
      banner: React.ReactNode,
      processing?: boolean,
    ) => {
      return (
        <Button
          loading={processing || loading}
          disabled={processing}
          variant="glass"
          size="lg"
          img={img}
          rounded
          className={s.action}
          onClick={() => spawnBanner(banner)}
        >
          {text}
        </Button>
      )
    }

    const ActionButton = () => {
      if (flow.every((e) => e.cond)) {
        return (
          <Button
            className={s.action}
            loading={loading}
            size="lg"
            img="Lambda"
            variant="glass"
            rounded
            onClick={openTimeline}
          >
            Open gULP
          </Button>
        )
      }

      const el = flow.find((e) => e.cond === false)
      if (!el) {
        return null
      }

      return el.trigger
    }

    const flow: Flow.Step[] = [
      {
        name: 'Authorized',
        cond: Info.User.isAuthorized(),
        trigger: ActionButtonConstructor('Log In', 'LogIn', <AuthBanner />),
        banner: <AuthBanner />
      },
      {
        name: 'At least one operation',
        cond: Info.app.target.operations.length > 0,
        trigger: ActionButtonConstructor(
          'Create Operation',
          Default.Icon.CREATE_OPERATION,
          <Operation.Create.Banner />,
        ),
        banner: <Operation.Create.Banner />
      },
      {
        name: 'Operation selected',
        cond: Boolean(GulpOperationEntity.selected(Info.app)),
        trigger: ActionButtonConstructor(
          'Select Operation',
          Default.Icon.OPERATION,
          <Operation.Select.Banner />,
        ),
        banner: <Operation.Select.Banner />,
      },
      {
        name: 'At least one context',
        cond: Info.app.target.contexts.length > 0,
        trigger: ActionButtonConstructor(
          'Create context',
          Default.Icon.CONTEXT,
          <UploadBanner />,
        ),
        banner: <UploadBanner />,
      },
      {
        name: 'At least one file',
        cond: Info.app.target.files.length > 0,
        trigger: ActionButtonConstructor(
          'Upload files',
          'Upload',
          <UploadBanner />,
        ),
        banner: <UploadBanner />,
      },
      {
        name: 'Sources selected',
        cond: File.selected(Info.app).length > 0,
        trigger: ActionButtonConstructor(
          'Select sources',
          Default.Icon.FILE,
          <SelectFiles.Banner />,
        ),
        banner: <SelectFiles.Banner />,
      },
      {
        name: 'Timeframe selected',
        cond: Info.app.timeline.frame.max > 0,
        trigger: ActionButtonConstructor(
          'Choose workflow frame',
          'TableColumnsSplit',
          <LimitsBanner />,
        ),
        banner: <LimitsBanner />,
      },
      {
        name: 'Glyphs syncronized',
        cond: Info.app.general.glyphs_syncronized,
        loading: Glyph.List.size < Glyph.Raw.length,
        trigger: ActionButtonConstructor(
          'Glyphs syncing',
          'Loader',
          <></>,
          true,
        ),
      },
    ]

    const backToOperations = () => {
      setWindows([])
      spawnBanner(<Operation.Select.Banner />)
    }

    return (
      <Stack
        className={cn(s.window, s.noWindows)}
        dir="column"
        jc="center"
        {...props}
      >
        <h3>Welcome to gULP workspace</h3>
        <p>Choose action below</p>
        <ActionButton />
        <Flow flow={flow} />
        <Stack>
          <Button
            img={Default.Icon.CREATE_OPERATION}
            variant="outline"
            onClick={() => spawnBanner(<Operation.Create.Banner />)}
          >
            Create Operation
          </Button>
          <Button
            img="Upload"
            variant="outline"
            onClick={() => spawnBanner(<UploadBanner />)}
          >
            Upload file
          </Button>
        </Stack>
        <Button
          style={{ width: 285 }}
          img="Undo2"
          variant="outline"
          onClick={backToOperations}
        >
          Back to operations
        </Button>
        <Button
          style={{ width: 285 }}
          img="Settings"
          variant="outline"
          onClick={() => spawnBanner(<Settings.Banner />)}
        >
          Settings
        </Button>
        <Button className={s.hint} variant="link" asChild>
          <a href="https://github.com/mentat-is/gulpui-web/blob/master/README.md">
            See documentation for more information
          </a>
        </Button>
        <img src="/mentat.png" className={s.logo} />
      </Stack>
    )
  }

  namespace Flow {
    export interface Step {
      name: string
      cond: boolean
      trigger: React.ReactNode
      icon?: Icon.Name
      loading?: boolean
      banner?: React.ReactNode
    }

    export interface Props {
      flow: Step[]
    }
  }

  const Flow = ({ flow }: Flow.Props) => {
    const { Info } = useApplication()

    useEffect(() => {
      if (Info.app.general.glyphs_syncronized) return

      if (Info.User.isAuthorized()) {
        Info.glyphs_reload()
      }
    }, [Info.app.general])

    return (
      <Stack className={s.flow} dir="column" ai="flex-start">
        {flow.map(Step)}
        <Separator />
        <Step
          name="Gulp ready"
          icon="Lambda"
          cond={flow.every((o) => o.cond)}
          trigger={<></>}
        />
      </Stack>
    )
  }

  const Step = ({
    name,
    cond,
    icon,
    loading: _loading,
    trigger,
    banner
  }: Flow.Step) => {
    const { spawnBanner } = useApplication()
    const [loading, setLoading] = useState(_loading)
    const [resolvedCond, setResolvedCond] = useState(cond)

    useEffect(() => {
      if (resolvedCond !== cond) {
        setLoading(true)
        const timer = setTimeout(() => {
          setResolvedCond(cond)
          setLoading(false)
        }, 1500)
        return () => clearTimeout(timer)
      }
    }, [cond, resolvedCond])

    const Image = loading ? (
      <Spinner />
    ) : (
      <Icon
        name={icon || (resolvedCond ? 'CheckCircleFill' : 'CheckCircle')}
      />
    )

    return (
      <p key={name} className={cn(resolvedCond && s.check)}>
        {Image}
        <span style={{ flex: 1 }}>{name}</span>
        {/* @ts-ignore */}
        <Badge variant='gray-subtle' onClick={() => banner ? spawnBanner(banner) : null} value={resolvedCond ? 'Done' : 'Do'} icon={resolvedCond ? undefined : 'Function'} size='sm' />
      </p>
    )
  }
}
