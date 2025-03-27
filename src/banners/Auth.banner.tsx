import { Banner } from '@/ui/Banner'
import { Button, Stack } from '@impactium/components'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Session } from './Session.banner'
import { useApplication } from '@/context/Application.context'
import { Input } from '@impactium/components'
import { toast } from 'sonner'
import { GulpDataset, Internal, Pattern, λUser } from '@/class/Info'
import { useKeyHandler } from '@/app/use'
import { Operation } from './Operation.banner'
import { Icon } from '@impactium/icons'
import { capitalize } from '@impactium/utils'
import { addDays } from 'date-fns'

export namespace AuthBanner {
  export type Props = Banner.Props
}

export function AuthBanner({ ...props }: AuthBanner.Props) {
  const { spawnBanner, Info } = useApplication()
  const loginButton = useRef<HTMLButtonElement>(null)
  const [isKeyPressed] = useKeyHandler('Enter')
  const [server, setServer] = useState<string>(Info.app.general.server)
  const [id, setId] = useState<string>(Info.app.general.id || 'admin')
  const [password, setPassword] = useState<string>('admin')
  const [loading, setLoading] = useState<boolean>(false)
  const [methods, setMethods] =
    useState<GulpDataset.GetAvailableLoginApi.Response>([])

  const ContinueFromSession = useCallback(
    () => (
      <Button
        variant="ghost"
        onClick={() =>
          spawnBanner(
            <Session.Load.Banner back={() => spawnBanner(<AuthBanner />)} />,
          )
        }
        img="Archive"
      />
    ),
    [],
  )

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
            toast('Server URL didn`t match pattern')
          })()
          : removeOverload(str)

      const validatedServer = validate(server)

      if (!validatedServer) return

      Internal.Settings.server = validatedServer

      await api<λUser>(
        '/login',
        {
          method: 'POST',
          setLoading,
          query: {
            ws_id: Info.app.general.ws_id,
          },
          body: {
            user_id: id,
            password,
          },
        },
        next,
      )
    }

    return (
      <Button
        img="LogIn"
        disabled={!id || !password}
        variant="glass"
        revert
        ref={loginButton}
        loading={loading}
        tabIndex={4}
        onClick={login}
        size="icon"
      />
    )
  }

  const next = async (user: λUser) => {
    Info.login(user)
    await Info.plugin_list()
    await Info.glyphs_reload()
    await Info.sync()
    await Info.sync()
    spawnBanner(<Operation.Select.Banner />)
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

  return (
    <Banner
      title="Authentication"
      option={<ContinueFromSession />}
      done={<DoneButton />}
      {...props}
    >
      <Input
        variant="highlighted"
        img="Server"
        placeholder="http://localhost:8080"
        value={server}
        tabIndex={1}
        onChange={(e) => setServer(e.currentTarget.value)}
      />
      <Input
        variant="highlighted"
        img="User"
        placeholder="admin"
        value={id}
        tabIndex={2}
        onChange={(e) => setId(e.currentTarget.value)}
      />
      <Input
        variant="highlighted"
        img="KeyRound"
        placeholder="admin"
        type="password"
        value={password}
        tabIndex={3}
        onChange={(e) => setPassword(e.currentTarget.value)}
      />
      <LoginMethods />
    </Banner>
  )
}

namespace LoginMethod {
  export interface Props {
    name: string
    icon: Icon.Name
  }
}
