import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SessionBanner } from './Session.banner';
import { useApplication } from '@/context/Application.context';
import { Input } from '@/ui/Input';
import { toast } from 'sonner';
import { Operation, Pattern } from '@/class/Info';
import { useKeyHandler } from '@/app/use';
import { Login } from '@/dto';
import { OperationBanner } from './Operation.banner';

export namespace AuthBanner {
  export interface Props extends Banner.Props {

  }
}

export function AuthBanner({ ...props }: AuthBanner.Props) {
  const { spawnBanner, Info } = useApplication();
  const loginButton = useRef<HTMLButtonElement>(null);
  const [isKeyPressed] = useKeyHandler('Enter');

  const [server, setServer] = useState<string>(Info.app.general.server);
  const [id, setId] = useState<string>(Info.app.general.id);
  const [password, setPassword] = useState<string>(Info.app.general.password);
  const [loading, setLoading] = useState<boolean>(false);

  const ContinueFromSession = useCallback(() => {
    const handleSubtitleButtonClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();

      spawnBanner(<SessionBanner />);
    }

    return (
      <Button variant='ghost' onClick={handleSubtitleButtonClick}>
        Continue with session
      </Button>
    )
  }, [])

  useEffect(() => {
    if (isKeyPressed && loginButton.current) {
      loginButton.current.click();
    }
  }, [isKeyPressed]);

  const DoneButton = useCallback(() => {
    const login = async () => {
      const removeOverload = (str: string): string => str.endsWith('/')
      ? removeOverload(str.slice(0, -1))
      : str;
    
      const validate = (str: string): string | void => !Pattern.Server.test(str)
        ? (() => { toast('Server URL didn`t match pattern') })()
        : removeOverload(str);

      const validatedServer = validate(server);

      if (!validatedServer) return;
      
      localStorage.setItem('__server', server);
      
      await api<Login>('/login', {
        method: 'PUT',
        setLoading,
        query: {
          user_id: id,
          password,
          ws_id: Info.app.general.ws_id
        }
      }, async (data) => {
        Info.login(data);
        await Info.index_reload();
        if (!Operation.selected(Info.app)) {
          spawnBanner(<OperationBanner />)
        }
      });
    }

    return (
      <Button img='LogIn' disabled={!id || !password} variant='glass' revert ref={loginButton} loading={loading} tabIndex={4} onClick={login} size='icon' />
    );
  }, [id, password, loading]);

  return (
    <Banner title='Authentication' subtitle={<ContinueFromSession />} done={<DoneButton />} fixed={true} {...props}>
      <Input
        img='Server'
        placeholder='http://localhost:8080'
        value={server}
        tabIndex={1}
        onChange={(e) => setServer(e.currentTarget.value)} />
      <Input
        img='User'
        placeholder='admin'
        value={id}
        tabIndex={2}
        onChange={e => setId(e.currentTarget.value)} />
      <Input
        img='KeyRound'
        placeholder='admin'
        type='password'
        value={password}
        tabIndex={3}
        onChange={e => setPassword(e.currentTarget.value)} />
    </Banner>
  )
}