import { useEffect, useState } from "react";
import Cookies from "universal-cookie";
import s from './Login.module.css';
import { useApplication } from "@/context/Application.context";
import { parseTokensFromCookies } from '@/ui/utils'
import { Card } from "@/ui/Card";
import { Session, Sessions } from "@/dto/Session.dto";
import { Index } from "@/class/Info";
import { toast } from "sonner";
import { Login, λOperation } from "@/dto";
import React from "react";
import { Input } from "@/ui/Input";
import { Separator } from "@/ui/Separator";
import { Button } from "@/ui/Button";
import { λIndex } from "@/dto/Index.dto";
import { CreateOperationBanner } from "@/banners/CreateOperationBanner";
import { UploadBanner } from "@/banners/Upload.banner";
import { SelectFilesBanner } from "@/banners/SelectFiles.banner";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";
import { Logger } from "@/dto/Logger.class";
import { Stack } from "@/ui/Stack";

export function LoginPage() {
  const { Info, app, api, spawnBanner } = useApplication();
  const [stage, setStage] = useState<number>(0);
  const [maxStage, setMaxStage] = useState<number>(0);
  const cookie = new Cookies();
  const [sessions, setSessions] = useState<Sessions>(parseTokensFromCookies(cookie.get('sessions')));
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingSession, setLoadingSession] = useState<string | null>(null);

  const stageMap = [
    'Authorization',
    'Select index',
    'Select operation'
  ]

  useEffect(() => {
    if (stage >= maxStage) {
      setMaxStage(stage);
    }
  }, [stage])

  useEffect(() => {
    if (!app.general.token || !app.general.server || !Index.selected(app)) return;

    cookie.set('last_used_server', app.general.server);

    !sessions.find(session => session.token === app.general.token) && sessions.push({
      token: app.general.token,
      server: app.general.server,
      expires: app.general.expires!,
      user_id: app.general.user_id
    })

    cookie.set('sessions', sessions);
  }, [app.general.token, app.general.server, app.general.expires, app.target.indexes]);

  useEffect(() => {
    if (sessions.some(s => s.expires < Date.now())) {
      const newSessions = sessions.filter(s => s.expires > Date.now());
      cookie.set('sessions', newSessions);
      setSessions(newSessions);
    }
  }, [sessions]);

  // AUTH

  const [serverValue, setServerValue] = useState<string>(cookie.get('last_used_server') || app.general.server);
  
  const login = async () => {
    const removeOverload = (str: string): string => str.endsWith('/')
    ? removeOverload(str.slice(0, -1))
    : str;

    const validate = (str: string): string | void => /^(https?:\/\/)(((\d{1,3}\.){3}\d{1,3})|([\w-]+\.)+[\w-]+)(\/[\w-./?%&=]*)?$/.test(str)
      ? (() => { toast('Server URL didn`t match pattern') })()
      : removeOverload(str);

    const server = validate(serverValue);

    if (!server) return;

    Info.setServer(server);
    setLoading(true);
    await api<Login>('/login', {
      server,
      method: 'PUT',
      data: {
        username: app.general.username,
        password: app.general.password
      }
    }).then((res) => {
      if (res.isSuccess()) {
        Logger.log(`User has been authentificated with next credentials:`, LoginPage.name)
        Logger.log({
          username: app.general.username,
          password: app.general.password,
          token: res.data.token,
          user_id: res.data.user_id,
          expires: res.data.time_expire
        }, LoginPage.name)
        Info.setToken(res.data.token);
        Info.setUserId(res.data.user_id);
        Info.setExpire(res.data.time_expire);
        cookie.set('last_used_server', app.general.server);
      } else {
        toast('Error during authorization', {
          description: 'Wrong username or password'
        });
        setLoading(false);
      }

    });
  }

  /** 
   * При авторизации фетчим индексы и перехоим на второй этап
  */
  useEffect(() => {
    if (app.general.token) {
      const processStage = async () => {
        await Info.mapping()
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
    Info.index_select(index)
  };
  /** 
   * При выборе индекса фетчим {λOperation[], λContext[], λPlugin[]} и перехоим на третий этап
  */
  useEffect(() => {
    if (!Index.selected(app)) return 
    
    Info.operations_reload().then(() => {
      setStage(2)
      setLoading(false);
    });
  }, [app.target.indexes]);


  // OPERATIONS


  const deleteOperation = (operation_id: number) => {
    setLoading(true);

    api('/operation_delete', {
      method: 'DELETE',
      data: {
        operation_id,
        index: Index.selected(app)
      }
    }).then(() => {
      Info.operations_reload().then(() => {
        setLoading(false);
      });
    });
  };

  const handleOperationSelect = (operation: λOperation) => {
    setLoading(true);
    Info.operations_select(operation)

    setStage(3);
  }

  useEffect(() => {
    if (stage < 3) return;

    spawnBanner(<SelectFilesBanner />);

    Info.query_operations();
  }, [stage]);

  const handleSessionButtonClick = async ({ server, token, ...session }: Session) => {
    setLoadingSession(token);
    const response = await api('/version', { server, token });

    if (response.isSuccess()) {
      Info.setToken(token);
      Info.setServer(server);
      Info.setExpire(session.expires);
      Info.setUserId(session.user_id);
      setStage(1);
    } else {
      toast('Session expired');
      deleteSession({...session, server, token });
    }
    setLoadingSession(null);
  }

  const deleteSession = (session: Session) => {
    setSessions((sessions) => {
      const newSessions = sessions.filter(s => s.token !== session.token);
      new Cookies().set('sessions', newSessions);
      return newSessions
    });
  }

  return (
    <div className={s.page}>
      <Card className={s.wrapper}>
        <div className={s.logo}>
          <img src='/gulp-no-text.svg' alt='' />
          Gulp
          <i>Web Client</i>
        </div>
        <div className={s.content}>
        <div className={s.step}>
          <Button disabled={stage <= 0} size='sm' img='ArrowLeft' onClick={() => setStage(s => s-1)} variant='ghost'>Previous step</Button>
          <p>{stageMap[stage]}</p>
          <Button disabled={maxStage < stage + 1} revert className={s.next_btn} onClick={() => setStage(s => s+1)} size='sm' img='ArrowRight' variant='ghost'>Next step</Button>
        </div>
        {stage === 0
          ? (
            <React.Fragment>
              <Input
                img='Server'
                placeholder="Server adress (ip:port)"
                value={serverValue}
                tabIndex={1}
                onChange={(e) => setServerValue(e.currentTarget.value)} />
              <Input
                img='User'
                placeholder="Username"
                value={app.general.username}
                tabIndex={2}
                onChange={e => Info.setUsername(e.currentTarget.value)} />
              <Input
                img='KeyRound'
                placeholder="Password"
                type='password'
                value={app.general.password}
                tabIndex={3}
                onChange={e => Info.setPassword(e.currentTarget.value)} />
            <div className={s.group}>
              {!!sessions.length && <Popover>
                <PopoverTrigger asChild>
                  <Button variant='outline' img='Container'>Previous instances</Button>
                </PopoverTrigger>
                <PopoverContent>
                  {sessions.map(session => (
                    <Button
                      key={session.token}
                      variant='ghost'
                      img='KeyRound'
                      loading={session.token === loadingSession}
                      disabled={!!loadingSession}
                      onClick={() => handleSessionButtonClick(session)}>
                        User {session.user_id} at {session.server}
                    </Button>
                ))}
                </PopoverContent>
              </Popover>}
              <Button loading={loading}tabIndex ={4} onClick={login}>Log in</Button>
            </div>
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
                  {app.target.operations.map((operation) => (
                    <div className={s.unit_group} key={operation.id}>
                      <Button onClick={() => handleOperationSelect(operation)} img='Workflow'>{operation.name}</Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size='icon'
                            variant='ghost'
                            img='Trash2' />
                        </PopoverTrigger>
                        <PopoverContent>
                          <Stack dir='column'>
                            <p>Are you shure?</p>
                            <Button
                              loading={loading}
                              onClick={() => deleteOperation(operation.id)}
                              variant='destructive'
                              img='Trash2'>Yes, delete operation {operation.name}!</Button>
                          </Stack>
                        </PopoverContent>
                      </Popover>
                      
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
    </div>
  )
}