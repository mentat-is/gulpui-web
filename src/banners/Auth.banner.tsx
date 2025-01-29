import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SessionBanner } from './Session.banner';
import { useApplication } from '@/context/Application.context';
import { Input } from '@impactium/components';
import { toast } from 'sonner';
import { GulpDataset, Operation, Pattern, λUser } from '@/class/Info';
import { useKeyHandler } from '@/app/use';
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
  const [id, setId] = useState<string>(Info.app.general.id || 'admin');
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

  const DoneButton = () => {
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
      
      await api<λUser>('/login', {  
        method: 'POST',
        setLoading,
        query: {
          ws_id: Info.app.general.ws_id
        },
        body: {
          user_id: id,
          password
        }
      }, async (data) => {
        if (data.token) {
          Info.login(data);
          await Info.index_reload();
          if (!Operation.selected(Info.app)) {
            spawnBanner(<OperationBanner />)
          }
        }
      });
    }

    return (
      <Button img='LogIn' disabled={!id || !password} variant='glass' revert ref={loginButton} loading={loading} tabIndex={4} onClick={login} size='icon' />
    );
  };

  return (
    <Banner title='Authentication' subtitle={<ContinueFromSession />} done={<DoneButton />} fixed={true} {...props}>
      <Input
        variant='highlighted'
        img='Server'
        placeholder='http://localhost:8080'
        value={server}
        tabIndex={1}
        onChange={(e) => setServer(e.currentTarget.value)} />
      <Input
        variant='highlighted'
        img='User'
        placeholder='admin'
        value={id}
        tabIndex={2}
        onChange={e => setId(e.currentTarget.value)} />
      <Input
        variant='highlighted'
        img='KeyRound'
        placeholder='admin'
        type='password'
        value={password}
        tabIndex={3}
        onChange={e => setPassword(e.currentTarget.value)} />
    </Banner>
  )
}