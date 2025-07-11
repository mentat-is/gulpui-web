import { Banner } from '@/ui/Banner'
import { Button, Spinner, Stack } from '@impactium/components'
import { useEffect, useRef, useState } from 'react'
import { Session } from '../banners/Session.banner'
import { useApplication } from '@/context/Application.context'
import { Input } from '@/ui/Input';
import { toast } from 'sonner'
import { GulpDataset, Internal, Operation, Pattern, λUser } from '@/class/Info'
import { useKeyHandler } from '@/decorator/use'
import { Icon } from '@impactium/icons'
import { capitalize, cn } from '@impactium/utils'
import { addDays } from 'date-fns'
import s from './styles/AuthPage.module.css'
import { Select } from '@/ui/Select'
import { λOperation } from '@/dto'
import { Label } from '@/ui/Label'
import { Operation as OperationBanners } from '@/banners/Operation.banner'
import { Keyboard } from '@/ui/Keyboard'

export namespace Auth {
  export namespace Page {
    export type Props = Banner.Props

  }
  export function Page({ ...props }: Auth.Page.Props) {
    const { spawnBanner, Info, app } = useApplication()
    const loginButton = useRef<HTMLButtonElement>(null)
    const [isKeyPressed] = useKeyHandler('Enter')
    const [server, setServer] = useState<string>(Info.app.general.server)
    const [id, setId] = useState<string>(Info.app.general.id || 'admin')
    const [password, setPassword] = useState<string>('admin')
    const [loading, setLoading] = useState<boolean>(false)
    const [isOperationsLoading, setIsOperationsLoading] = useState<number>(0)
    const [methods, setMethods] = useState<GulpDataset.GetAvailableLoginApi.Response>([])

    useEffect(() => {
      if (methods.length === 0) {
        Internal.Settings.server = server
        api<GulpDataset.GetAvailableLoginApi.Response>(
          '/get_available_login_api',
          {
            toast: false,
          },
          setMethods,
        )
      }
    }, [methods, server])

    useEffect(() => {
      if (isKeyPressed && loginButton.current) {
        loginButton.current.click()
      }
    }, [isKeyPressed])

    const DoneButton = () => {
      const login = async () => {
        const removeOverload = (str: string): string =>
          str.endsWith('/') ? removeOverload(str.slice(0, -1)) : str

        const validate = (str: string): string | void =>
          !Pattern.Server.test(str)
            ? (() => {
              toast('Incorrect server URL', {
                icon: <Icon name='Warning' />
              })
            })()
            : removeOverload(str)

        const validatedServer = validate(server)

        if (!validatedServer) return

        Internal.Settings.server = validatedServer

        setLoading(true);
        await api<λUser>('/login', {
          method: 'POST',

          raw: true,
          query: {
            ws_id: Info.app.general.ws_id,
          },
          body: {
            user_id: id,
            password,
          },
        }).then(response => {
          if (response.isSuccess()) {
            next(response.data);
          } else {
            toast.error('Invalid server URL, or username, or password', {
              richColors: true,
              icon: <Icon name='Warning' />
            })
            setLoading(false);
            setIsOperationsLoading(0);
          }
        })
      }

      return (
        <Button
          img="LogIn"
          disabled={!id || !password}
          variant="glass"
          revert
          ref={loginButton}
          loading={loading || isOperationsLoading === 1}
          tabIndex={4}
          onClick={login}
          style={{ marginLeft: 'auto' }}
        >Login</Button>
      )
    }

    const next = async (user: λUser) => {
      Info.login(user)
      await Info.plugin_list()
      await Info.glyphs_reload()
      setIsOperationsLoading(1);
      await Info.sync()
      setIsOperationsLoading(2);
      setLoading(false);

      const sessions = await Info.session_list(user.id);
      if (sessions.length) {
        spawnBanner(<Session.Load.Banner sessions={sessions} />)
        return;
      }
    }

    useEffect(() => {
      const query = new URLSearchParams(window.location.search)
      const token = query.get('token')
      const id = (query.get('id') || 'guest') as λUser['id']
      const time_expire =
        Number(query.get('time_expire')) || addDays(Date.now(), 7).valueOf()
      if (!token) return

      history.replaceState(null, '', window.location.origin)

      next({ token, id, time_expire })
      setLoading(true)
    }, [])

    const [customLoading, setCustomLoading] = useState<string | null>(null)

    const customLoginConstructor = (url: string) => () => {
      const x = new URLSearchParams()
      x.append('client', window.location.origin)
      x.append('ws_id', Info.app.general.ws_id)
      setCustomLoading(url)
      window.location.replace(`${Internal.Settings.server}${url}?${x}`)
    }

    const LoginMethods = () => {
      if (
        methods.length === 0 ||
        (methods.length === 1 && methods[0].name === 'gulp')
      ) {
        return null
      }

      function LoginMethod({ name, icon }: LoginMethod.Props) {
        const method = methods.find((method) => method.name === name)
        if (!method) {
          return null
        }

        return (
          <Button
            onClick={customLoginConstructor(method.login.url)}
            loading={customLoading === method.login.url}
            style={{ flex: 1 }}
            img={icon}
          >
            Login with {capitalize(name)}
          </Button>
        )
      }

      return (
        <Stack>
          <LoginMethod name="microsoft" icon="LogoMicrosoft" />
          <LoginMethod name="google" icon="LogoGoogle" />
        </Stack>
      )
    }

    const SelectTrigger = () => {
      const selected = Operation.selected(Info.app)

      if (isOperationsLoading === 0) {
        return null;
      }

      if (isOperationsLoading === 1) {
        return (
          <Select.Trigger disabled>
            <Spinner />
            Loading operations list
          </Select.Trigger>
        )
      }

      return (
        <Select.Trigger>
          <Select.Icon name={Operation.icon((selected || {}) as λOperation)} />
          {selected ? selected.name : 'Select operation or create new one'}
        </Select.Trigger>
      )
    }

    return (
      <Stack className={s.wrapper} dir='column' ai='center' jc='center'>
        <p className={s.title}>[ Login ]</p>
        <Input
          variant="highlighted"
          img="Link"
          label='Server adress'
          placeholder="http://localhost:8080"
          value={server}
          disabled={isOperationsLoading === 2}
          tabIndex={1}
          onChange={(e) => setServer(e.currentTarget.value)}
        />
        <Input
          variant="highlighted"
          label='Username'
          img="User"
          placeholder="admin"
          value={id}
          disabled={isOperationsLoading === 2}
          tabIndex={2}
          onChange={(e) => setId(e.currentTarget.value)}
        />
        <Input
          variant="highlighted"
          img="KeyRound"
          label='Password'
          placeholder="admin"
          type="password"
          value={password}
          disabled={isOperationsLoading === 2}
          tabIndex={3}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <LoginMethods />
        <Stack dir='column' gap={6} ai='flex-start' data-input className={cn(s.operation, isOperationsLoading === 2 && s.visible)}>
          <Label value='Operation' />
          <Stack style={{ width: '100%' }}>
            <Select.Root
              defaultValue={Operation.selected(Info.app)?.id}
              onValueChange={(id) => Info.operations_select(id as λOperation['id'])}
            >
              <SelectTrigger />
              <Select.Content>
                {app.target.operations.map((operation) => (
                  <Select.Item key={operation.id} value={operation.id}>
                    <Select.Icon name={Operation.icon(operation)} />
                    {operation.name}
                  </Select.Item>
                ))}
                <Button img='BookPlus' style={{ width: '100%' }} onClick={() => spawnBanner(<OperationBanners.Create.Banner />)} variant='ghost'>
                  Create new operation
                </Button>
              </Select.Content>
            </Select.Root>
          </Stack>
        </Stack>
        {isOperationsLoading > 0 ? null : <DoneButton />}
      </Stack>
    )
  }
}


namespace LoginMethod {
  export interface Props {
    name: string
    icon: Icon.Name
  }
}
