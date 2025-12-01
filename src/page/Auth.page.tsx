import { useEffect, useState, useRef, JSX } from 'react'
import { Button as UIButton } from '@/ui/Button';
import { Application } from '@/context/Application.context'
import { Input } from '@/ui/Input';
import { toast } from 'sonner'
import { GulpDataset, Pattern } from '@/class/Info'
import { Icon } from '@impactium/icons'
import { capitalize, cn } from '@impactium/utils'
import s from './styles/AuthPage.module.css'
import { Select } from '@/ui/Select'
import { Label } from '@/ui/Label'
import { SelectFiles } from '@/banners/SelectFiles.banner'
import { UploadBanner } from '@/banners/Upload.banner'
import { Banner as UIBanner } from '@/ui/Banner';
import { Stack } from '@/ui/Stack';
import { User } from '@/entities/User';
import { Operation } from '@/entities/Operation';
import { Internal } from '@/entities/addon/Internal';
import { Shimmer } from '@/ui/Shimmer';
import { Session } from '@/banners/Session.banner';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { Logo } from '@/components/Logo';

export namespace Auth {
  export namespace Page {
    export interface Props { }
  }

  export function Page(_: Auth.Page.Props) {
    const { spawnBanner, Info, app, spawnDialog } = Application.use()
    const [server, setServer] = useState<string>(Info.app.general.server)
    const [id, setId] = useState('admin' as User.Id);
    const [password, setPassword] = useState<string>('admin')
    const [loading, setLoading] = useState<boolean>(false)
    const [sessions, setSessions] = useState<Internal.Session.Data[]>([]);
    const [methods, setMethods] = useState<GulpDataset.GetAvailableLoginApi.Response>([])
    const [openSelectAuth, setOpenSelectAuth] = useState<'operation' | 'session' | null>(null);
    const currentBannerRef = useRef<JSX.Element | null>(null);

    useEffect(() => {
      if (methods.length === 0) {
        Internal.Settings.server = server
        api<GulpDataset.GetAvailableLoginApi.Response>('/get_available_login_api', {
          toast: {
            onError: payload => payload.status === 'error' ? toast.warning('Auth plugin is not configured', {
              description: 'Check configuration file on server side',
              icon: <Icon name='Warning' />,
              richColors: true
            }) : undefined
          },
        }, setMethods)
      }
    }, [methods, server])

    const openAuthBanner = (banner: JSX.Element) => {
      if (currentBannerRef.current) {
        spawnBanner(null);
      }
      currentBannerRef.current = banner;
      spawnBanner(banner);
      setOpenSelectAuth(null);
    };

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

      reloadSessionsList(user);
    };

    const reloadSessionsList = (user: User.Type | null) => {
      setTimeout(() => Info.session_list(user).then(setSessions), 0);
    }

    const NextButton = () => {
      if (!app.general.user) {
        return (
          <UIButton
            icon='LogIn'
            disabled={!id || !password}
            variant='glass'
            revert
            loading={loading}
            tabIndex={4}
            onClick={login}
            style={{ marginLeft: 'auto' }}
          >Login</UIButton>
        )
      }

      if (Operation.Entity.selected(app)) {
        return (
          <UIButton
            icon='Check'
            variant='glass'
            revert
            loading={loading}
            tabIndex={6}
            onClick={onLoginAndOperationSelection}
            style={{ marginLeft: 'auto' }}
          >Done</UIButton>
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
          <UIButton
            onClick={customLoginConstructor(method.login.url)}
            loading={customLoading === method.login.url}
            style={{ flex: 1 }}
            icon={icon}
          >
            Login with {capitalize(name)}
          </UIButton>
        )
      }

      return (
        <Stack>
          <LoginMethod name='microsoft' icon='LogoMicrosoft' />
          <LoginMethod name='google' icon='LogoGoogle' />
        </Stack>
      )
    }

    const SelectOperationTrigger = () => {
      const selected = Operation.Entity.selected(Info.app)

      if (!app.general.user) {
        return null;
      }

      return (
        <Select.Trigger tabIndex={5}>
          <Select.Icon name={Operation.Entity.icon((selected || {}) as Operation.Type)} />
          {selected ? selected.name : 'Select operation or create new one'}
        </Select.Trigger>
      )
    }

    const onLoginAndOperationSelection = () => {
      const operation = Operation.Entity.selected(app);
      if (!operation) {
        return;
      }

      switch (true) {
        case app.target.files.filter(file => file.operation_id === operation.id).length > 0:
          spawnBanner(<SelectFiles.Banner fixed />);
          break;

        default:
          spawnBanner(<UploadBanner />);
          break;
      }
    };

    const load_session = (name: string) => {
      const session = sessions.find(session => session.name === name);
      if (!session) {
        return;
      }

      Info.session_load(session);
      if (session.timeline.target) {
        spawnDialog(<DisplayEventDialog event={session.timeline.target} />)
      }
    }

    return (
      <Stack className={s.wrapper} dir='column' ai='center' jc='center'>
        <Logo />
        <Shimmer duration={2} className={s.title} as='p' color='var(--gray-800)'>[ Login ]</Shimmer>
        <Input
          variant='highlighted'
          icon='Link'
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
          icon='User'
          placeholder='admin'
          value={id}
          disabled={!!app.general.user}
          tabIndex={2}
          onChange={(e) => setId(e.currentTarget.value as typeof id)}
        />
        <Input
          variant='highlighted'
          icon='KeyRound'
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
              open={openSelectAuth === 'operation'}
              onOpenChange={(isOpen) => setOpenSelectAuth(isOpen ? 'operation' : null)}
              defaultValue={Operation.Entity.selected(Info.app)?.id}
              onValueChange={(id) => Info.operations_select(id as Operation.Id)}
            >
              <SelectOperationTrigger />
              <Select.Content>
                {app.target.operations.map((operation) => (
                  <Stack key={operation.id} gap={2}>
                    <Select.Item value={operation.id}>
                      <Select.Icon name={Operation.Entity.icon(operation)} />
                      {operation.name}
                      <span className={s.operation_description}>{operation.description}</span>
                    </Select.Item>
                    <UIButton icon='PencilEdit' style={{ color: 'var(--second) !important' }} variant='tertiary' onClickCapture={() => openAuthBanner(<Operation.CreateOrUpdate.Banner operation={operation} />)} />
                  </Stack>
                ))}
                <UIButton icon='BookPlus' style={{ width: '100%' }} onClick={() => openAuthBanner(<Operation.CreateOrUpdate.Banner />)} variant='tertiary'>
                  Create new operation
                </UIButton>
              </Select.Content>
            </Select.Root>
          </Stack>
        </Stack>
        <Stack dir='column' gap={6} ai='flex-start' data-input className={cn(s.operation, !!app.general.user && Operation.Entity.selected(app) && sessions.filter(session => session.selected.operations && session.selected.operations === Operation.Entity.selected(app)?.id).length && s.visible)}>
          <Label value='Session' />
          <Stack style={{ width: '100%' }}>
            <Select.Root
              open={openSelectAuth === 'session'}
              onOpenChange={(isOpen) => setOpenSelectAuth(isOpen ? 'session' : null)}
              onValueChange={name => load_session(name)}
            >
              <Select.Trigger tabIndex={5}>
                <Select.Icon name='Status' />
                Select session
              </Select.Trigger>
              <Select.Content>
                {sessions.filter(session => session.selected.operations && session.selected.operations === Operation.Entity.selected(app)?.id).map(session => (
                  <Select.Item key={session.name} value={session.name} style={{ color: session.color }}>
                    <Select.Icon name={session.icon} />
                    {session.name}
                  </Select.Item>
                ))}
                <UIButton variant='tertiary' style={{ width: '100%' }} onClick={() => openAuthBanner(<Session.Delete.Banner onClose={() => reloadSessionsList(app.general.user)} />)} icon='Wrench'>Manage sessions</UIButton>
              </Select.Content>
            </Select.Root>
          </Stack>
        </Stack>
        <NextButton />
      </Stack>
    )
  }

  export namespace Banner {
    export interface Props extends UIBanner.Props { }
  }

  export function Banner({ className, ...props }: Banner.Props) {
    const { Info, app } = Application.use()
    const [server, setServer] = useState<string>(Info.app.general.server)
    const [id, setId] = useState('admin' as User.Id);
    const [password, setPassword] = useState<string>('admin')
    const [loading, setLoading] = useState<boolean>(false)
    const [methods, setMethods] = useState<GulpDataset.GetAvailableLoginApi.Response>([])

    useEffect(() => {
      if (methods.length === 0) {
        Internal.Settings.server = server
        api<GulpDataset.GetAvailableLoginApi.Response>('/get_available_login_api', {
          toast: {
            onError: payload => payload.status === 'error' ? toast.warning('Auth plugin is not configured', {
              description: 'Check configuration file on server side',
              icon: <Icon name='Warning' />,
              richColors: true
            }) : undefined
          },
        }, setMethods)
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
      await Info.login({ id, password });
      setLoading(false);
    };

    const NextButton = () => <UIButton icon='LogIn' disabled={!id || !password} variant='glass' loading={loading} tabIndex={4} onClick={login} />;

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
          <UIButton
            onClick={customLoginConstructor(method.login.url)}
            loading={customLoading === method.login.url}
            style={{ flex: 1 }}
            icon={icon}
          >
            Login with {capitalize(name)}
          </UIButton>
        )
      }

      return (
        <Stack>
          <LoginMethod name='microsoft' icon='LogoMicrosoft' />
          <LoginMethod name='google' icon='LogoGoogle' />
        </Stack>
      )
    }

    return (
      <UIBanner done={<NextButton />} className={cn(className, s.banner)} {...props}>
        <Stack className={s.wrapper} dir='column' ai='center' jc='center'>
          <Shimmer duration={2} className={s.title} as='p' color='var(--gray-800)'>[ Login ]</Shimmer>
          <Input
            variant='highlighted'
            icon='Link'
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
            icon='User'
            placeholder='admin'
            value={id}
            disabled={!!app.general.user}
            tabIndex={2}
            onChange={(e) => setId(e.currentTarget.value as typeof id)}
          />
          <Input
            variant='highlighted'
            icon='KeyRound'
            label='Password'
            placeholder='admin'
            type='password'
            value={password}
            disabled={!!app.general.user}
            tabIndex={3}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <LoginMethods />
        </Stack>
      </UIBanner>
    )
  }
}


namespace LoginMethod {
  export interface Props {
    name: string
    icon: Icon.Name
  }
}
