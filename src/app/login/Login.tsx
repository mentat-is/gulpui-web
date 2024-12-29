import { useEffect, useRef, useState } from 'react';
import Cookies from 'universal-cookie';
import s from './Login.module.css';
import { useApplication } from '@/context/Application.context';
import { Card } from '@/ui/Card';
import { Index, Pattern } from '@/class/Info';
import { toast } from 'sonner';
import { Login, λOperation } from '@/dto';
import React from 'react';
import { Input } from '@/ui/Input';
import { Separator } from '@/ui/Separator';
import { λIndex } from '@/dto/Index.dto';
import { CreateOperationBanner } from '@/banners/CreateOperation.banner';
import { UploadBanner } from '@/banners/Upload.banner';
import { SelectFilesBanner } from '@/banners/SelectFiles.banner';
import { Logger } from '@/dto/Logger.class';
import { Stack, Button } from '@impactium/components';
import { GeneralSettings } from '@/components/GeneralSettings';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/ui/ContextMenu';

export function LoginPage() {
  const { Info, app, spawnBanner } = useApplication();
  const [stage, setStage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const loginButton = useRef<HTMLButtonElement>(null);

  // AUTH
  const [serverValue, setServerValue] = useState<string>(app.general.server);

  const [id, setId] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin');
  
  const login = async () => {
    const removeOverload = (str: string): string => str.endsWith('/')
    ? removeOverload(str.slice(0, -1))
    : str;

    const validate = (str: string): string | void => !Pattern.Server.test(str)
      ? (() => { toast('Server URL didn`t match pattern') })()
      : removeOverload(str);

    const server = validate(serverValue);

    if (!server) return;

    localStorage.setItem('__server', server);

    await api<Login>('/login', {
      method: 'PUT',
      setLoading,
      query: {
        user_id: id,
        password,
        ws_id: app.general.ws_id
      }
    }, (data) => {
      Logger.log(`User has been authentificated with next credentials:`, LoginPage.name)
      Logger.log(data, LoginPage.name);
      Info.login(data);
    });
  }

  /** 
   * При авторизации фетчим индексы и перехоим на второй этап
  */
  useEffect(() => {
    if (app.general.token) {
      // Info.getSessions().then(sessions => {
      //   if (Object.keys(sessions).length) {
      //     spawnBanner(<SelectSession sessions={sessions} />)
      //   }
      // });

      const processStage = async () => {
        // await Info.mapping()
        await Info.index_reload()
        setLoading(false);
        setStage(1);
      }

      processStage();
    }
  }, [app.general.token]);


  // INDEXES

  
  const handleIndexSelection = async (index: λIndex) => {
    setLoading(true);
    Info.index_select(index);
  };
  /** 
   * При выборе индекса фетчим {λOperation[], λContext[], λPlugin[]} и перехоим на третий этап
  */
  useEffect(() => {
    if (!Index.selected(app)) return;
    
    Info.operation_list().then(() => {
      setStage(2) 
      setLoading(false);
    });
  }, [app.target.indexes]);


  // OPERATIONS


  const deleteOperation = (operation_id: λOperation['id']) => {
    const index = Index.selected(app)

    if (!index) {
      return;
    }

    api('/operation_delete', {
      method: 'DELETE',
      query: {
        operation_id,
        index: index.name
      },
      setLoading
    }, Info.operation_list)
  };

  const handleOperationSelect = (operation: λOperation) => {
    setLoading(true);
    Info.operations_select(operation)

    setStage(3);
  }

  useEffect(() => {
    if (stage < 3) return;

    spawnBanner(<SelectFilesBanner />);
  }, [stage]);

  return (
    <div className={s.page}>
      <Card className={s.wrapper}>
        <div className={s.logo}>
          <img src='/gulp-geist.svg' alt='' />
          <h1>Gulp</h1>
          <i>Web Client</i>
        </div>
        <div className={s.content}>
        {stage === 0
          ? (
            <React.Fragment>
              <Input
                img='Server'
                placeholder='Server adress (ip:port)'
                value={serverValue}
                tabIndex={1}
                onChange={(e) => setServerValue(e.currentTarget.value)} />
              <Input
                img='User'
                placeholder='Username'
                value={id}
                tabIndex={2}
                onChange={e => setId(e.currentTarget.value)} />
              <Stack gap={12}>
                <Input
                  img='KeyRound'
                  placeholder='Password'
                  type='password'
                  value={password}
                  tabIndex={3}
                  onChange={e => setPassword(e.currentTarget.value)} />
                <Button img='LogIn' disabled={!id || !password} revert ref={loginButton} loading={loading} tabIndex={4} onClick={login}>Log in</Button>
              </Stack>
          </React.Fragment>
          )
          : stage === 1
            ? (
              <div className={s.chooser}>
                {app.target.indexes.map((index) => 
                  <Button
                    loading={loading}
                    key={index.name}
                    className={s.index_button}
                    onClick={() => handleIndexSelection(index)}
                    img='Workflow'>{index.name}</Button>
                )}
              </div>
              )
            :  stage === 2 
              ? (
                <div className={s.chooser}>
                  {app.target.operations.map((operation, i) => (
                    <div className={s.unit_group} key={operation.id}>
                      <ContextMenu>
                        <ContextMenuTrigger style={{ width: '100%' }}>
                          <Button tabIndex={i * 1} onClick={() => handleOperationSelect(operation)} img={'ScanSearch'}>{operation.name}</Button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuSub>
                            <ContextMenuSubTrigger img='Trash2'>Delete!</ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                              <ContextMenuItem onClick={() => deleteOperation(operation.id)} img='Trash2'>Yes, delete operation {operation.name}!</ContextMenuItem>
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  ))}
                  <Separator />
                  <Button
                    variant='glass'
                    img='Plus'
                    style={{ width: '100%' }}
                    onClick={() => spawnBanner(<CreateOperationBanner />)}>Create new operation</Button>
                </div>
              )
              : (
                <>
                  <p>🦆 Quack! You found me! Let's keep it our little secret 😉</p>
                  <div className={s.back}>
                    <Button onClick={() => spawnBanner(<UploadBanner />)} variant='ghost'>Upload files</Button>
                    <Button onClick={() => setStage(2)}>Back to operations</Button>
                  </div>
                </>
              )
        }
        </div>
      </Card>
      <GeneralSettings />
    </div>
  )
}