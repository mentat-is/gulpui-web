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
import { SelectFiles } from '@/banners/SelectFiles.banner'
import { UploadBanner } from '@/banners/Upload.banner'

export namespace Auth {
  export namespace Page {
    export type Props = Banner.Props

  }
  export function Page({ ...props }: Auth.Page.Props) {
    const { spawnBanner, Info, app } = useApplication()
    const [server, setServer] = useState<string>(Info.app.general.server)
    const [id, setId] = useState('admin' as λUser['id']);
    const [password, setPassword] = useState<string>('admin')
    const [loading, setLoading] = useState<boolean>(false)
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

      // Wrap into loading state
      setLoading(true);
      const user = await Info.login({ id, password });
      setLoading(false);

      if (user) {
        const sessions = await Info.session_list();
        if (sessions.length > 0) {
          spawnBanner(<Session.Load.Banner sessions={sessions} />)
        }
      }
    };

    const NextButton = () => {
      if (!app.general.user) {
        return (
          <Button
            img='LogIn'
            disabled={!id || !password}
            variant='glass'
            revert
            loading={loading}
            tabIndex={4}
            onClick={login}
            style={{ marginLeft: 'auto' }}
          >Login</Button>
        )
      }

      if (Operation.selected(app)) {
        return (
          <Button
            img='Check'
            variant='glass'
            revert
            loading={loading}
            tabIndex={6}
            onClick={onLoginAndOperationSelection}
            style={{ marginLeft: 'auto' }}
          >Done</Button>
        );
      }

      return null;
    }

    useEffect(() => {
      const query = new URLSearchParams(window.location.search)
      const token = query.get('token')

      if (!token) return;

      history.replaceState(null, '', window.location.origin)

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
          <LoginMethod name='microsoft' icon='LogoMicrosoft' />
          <LoginMethod name='google' icon='LogoGoogle' />
        </Stack>
      )
    }

    const SelectTrigger = () => {
      const selected = Operation.selected(Info.app)

      if (!app.general.user) {
        return null;
      }

      return (
        <Select.Trigger tabIndex={5}>
          <Select.Icon name={Operation.icon((selected || {}) as λOperation)} />
          {selected ? selected.name : 'Select operation or create new one'}
        </Select.Trigger>
      )
    }

    const onLoginAndOperationSelection = () => {
      switch (true) {
        case app.target.files.length > 0:
          spawnBanner(<SelectFiles.Banner fixed />);
          break;

        default:
          spawnBanner(<UploadBanner />);
          break;
      }
    };

    return (
      <Stack className={s.wrapper} dir='column' ai='center' jc='center'>
        <p className={s.title}>[ Login ]</p>
        <Input
          variant='highlighted'
          img='Link'
          label='Server adress'
          placeholder='http://localhost:8080'
          value={server}
          disabled={!!app.general.user}
          tabIndex={1}
          onChange={(e) => setServer(e.currentTarget.value)}
        />
        <Input
          variant='highlighted'
          label='Username'
          img='User'
          placeholder='admin'
          value={id}
          disabled={!!app.general.user}
          tabIndex={2}
          onChange={(e) => setId(e.currentTarget.value as typeof id)}
        />
        <Input
          variant='highlighted'
          img='KeyRound'
          label='Password'
          placeholder='admin'
          type='password'
          value={password}
          disabled={!!app.general.user}
          tabIndex={3}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <LoginMethods />
        <Stack dir='column' gap={6} ai='flex-start' data-input className={cn(s.operation, !!app.general.user && s.visible)}>
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
        <NextButton />
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
