import { useEffect, useState } from "react";
import Cookies from "universal-cookie";
import s from './Login.module.css';
import { useApplication } from "@/context/Application.context";
import { parseTokensFromCookies } from '@/ui/utils'
import { Page } from "@/components/Page";
import { Card } from "@/ui/Card";
import { SessionsChooser } from "./components/Session";
import { Sessions } from "@/dto/Session.dto";
import { Context, Index } from "@/class/Info";
import { toast } from "sonner";
import { Login, λOperation } from "@/dto";
import React from "react";
import { Input } from "@/ui/Input";
import { Separator } from "@/ui/Separator";
import { Button } from "@/ui/Button";
import { λIndex } from "@/dto/Index.dto";
import { Icon } from "@/ui/Icon";
import { Banner } from "@/ui/Banner";
import { CreateOperationBanner } from "@/banners/CreateOperationBanner";
import { IngestBanner } from "@/banners/IngestBanner";
import { SelectContextBanner } from "@/banners/SelectContextBanner";

export function LoginPage() {
  const { Info, app, api, spawnBanner } = useApplication();
  const [stage, setStage] = useState<number>(0);
  const cookie = new Cookies();
  const [sessions, setSessions] = useState<Sessions>(parseTokensFromCookies(cookie.get('sessions')));
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!app.general.token || !app.general.server || !Index.selected(app)) return;

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

  const [serverValue, setServerValue] = useState<string>(app.general.server);
  
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
        Info.setToken(res.data.token);
        Info.setUserId(res.data.user_id);
        Info.setExpire(res.data.time_expire);
      } else if (parseInt(res.status) < 500) toast('Error during authorization', {
        description: 'Wrong username or password'
      });
    });
    setLoading(false);
    setStage(1);
  }

  /** 
   * При авторизации фетчим индексы и перехоим на второй этап
  */
  useEffect(() => {
    if (app.general.token) {
      Info.mapping_file_list();
      Info.index_reload().then(() => setLoading(false));
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

    Info.operations_request().then(operations => {
      const result = Info.operations_update(operations);

      spawnBanner(!result.contexts?.length || !result.plugins?.length || !result.files?.length
        ? <IngestBanner onIngest={() => setStage(stage => stage++)} />
        : <SelectContextBanner />
      );
    });
  }, [stage]);

  const spawnBannerToRequestDelete = (operation: λOperation) => {
    spawnBanner(
      <Banner title={`Delete operation -> ${operation.name}`}>
        <Button
          loading={loading}
          onClick={() => deleteOperation(operation.id)}
          variant='destructive'
          img='Trash2'>Yes, delete!</Button>
      </Banner>
    )
  }
  
  return (
    <Page options={{ center: true }} className={s.page}>
      <Card className={s.wrapper}>
        <div className={s.logo}>
          <img className={s.logo} src='/gulp-no-text.svg' alt='' />
          Gulp
          <i>Web Client</i>
        </div>
        {stage === 0
          ? (
            <React.Fragment>
              <Input
                img='Database'
                placeholder="Server adress (ip:port)"
                value={serverValue}
                onChange={(e) => setServerValue(e.currentTarget.value)} />
              <Input
                img='User'
                placeholder="Username"
                value={app.general.username}
                onChange={e => Info.setUsername(e.currentTarget.value)} />
              <Input
                img='KeyRound'
                placeholder="Password"
                type='password'
                value={app.general.password}
                onChange={e => Info.setPassword(e.currentTarget.value)} />
            <Separator />
            <div className={s.group}>
              <Button loading={loading} onClick={login}>Log in</Button>
            </div>
          </React.Fragment>
          )
          : stage === 1
            ? (
              <div className={s.chooser}>
                <p className={s.cluster}><Icon name='Combine' />Choose database index</p>
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
                  <p className={s.cluster}><Icon name='Hexagon' />Choose operation node</p>
                  {app.target.operations.map((operation) => (
                    <div className={s.unit_group} key={operation.id}>
                      <Button onClick={() => handleOperationSelect(operation)} img='Workflow'>{operation.name}</Button>
                      <Button
                        size='icon'
                        onClick={() => spawnBannerToRequestDelete(operation)}
                        variant='destructive'
                        img='Trash2' />
                      </div>
                  ))}
                  <Separator />
                  <Button
                    variant='outline'
                    img='Plus'
                    style={{ width: '100%' }}
                    onClick={() => spawnBanner(<CreateOperationBanner />)}>Create new operation</Button>
                </div>
              )
              : (
                <p>🦆 Quack! You found me! Let's keep it our little secret 😉</p>
                )
        }
      </Card>
      {!!sessions.length && (!app.general.token || !app.target.indexes.length) && <SessionsChooser sessions={sessions.slice(-5)} setSessions={setSessions} />}
    </Page>
  )
}