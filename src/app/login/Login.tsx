import { useEffect, useRef, useState } from "react";
import Cookies from "universal-cookie";
import s from './Login.module.css';
import { useApplication } from "@/context/Application.context";
import { Card } from "@/ui/Card";
import { Index, Pattern } from "@/class/Info";
import { toast } from "sonner";
import { Login, λOperation } from "@/dto";
import React from "react";
import { Input } from "@/ui/Input";
import { Separator } from "@/ui/Separator";
import { Button } from "@/ui/Button";
import { λIndex } from "@/dto/Index.dto";
import { CreateOperationBanner } from "@/banners/CreateOperation.banner";
import { UploadBanner } from "@/banners/Upload.banner";
import { SelectFilesBanner } from "@/banners/SelectFiles.banner";
import { Logger } from "@/dto/Logger.class";
import { Stack } from "@impactium/components";
import { GlyphMap } from "@/dto/Glyph.dto";
import { GeneralSettings } from "@/components/GeneralSettings";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/ui/ContextMenu";
import { SelectSession } from "@/banners/SelectSession";

export function LoginPage() {
  const { Info, app, spawnBanner } = useApplication();
  const [stage, setStage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const loginButton = useRef<HTMLButtonElement>(null);
  const cookie = new Cookies();

  useEffect(() => {

  }, [loginButton])

  // AUTH

  const [serverValue, setServerValue] = useState<string>(cookie.get('last_used_server') || app.general.server);
  
  const login = async () => {
    const removeOverload = (str: string): string => str.endsWith('/')
    ? removeOverload(str.slice(0, -1))
    : str;

    const validate = (str: string): string | void => !Pattern.Server.test(str)
      ? (() => { toast('Server URL didn`t match pattern') })()
      : removeOverload(str);

    const server = validate(serverValue);

    if (!server) return;

    Info.setServer(server);

    await api<Login>('/login', {
      method: 'PUT',
      setLoading,
      query: {
        user_id: app.general.username,
        password: app.general.password,
        ws_id: app.general.ws_id
      }
    }, (data) => {
      Logger.log(`User has been authentificated with next credentials:`, LoginPage.name)
      Logger.log({
        username: app.general.username,
        password: app.general.password,
        token: data.token,
        user_id: data.user_id,
        expires: data.time_expire
      }, LoginPage.name)
      Info.setToken(data.token);
      Info.setUserId(data.user_id);
      Info.setExpire(data.time_expire);
      cookie.set('last_used_server', app.general.server);
    });
  }

  /** 
   * При авторизации фетчим индексы и перехоим на второй этап
  */
  useEffect(() => {
    if (app.general.token) {
      Info.getSessions().then(sessions => {
        if (Object.keys(sessions).length) {
          spawnBanner(<SelectSession sessions={sessions} />)
        }
      });

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
    Info.index_select(index);
  };
  /** 
   * При выборе индекса фетчим {λOperation[], λContext[], λPlugin[]} и перехоим на третий этап
  */
  useEffect(() => {
    if (!Index.selected(app)) return;
    
    Info.operations_reload().then(() => {
      setStage(2) 
      setLoading(false);
    });
  }, [app.target.indexes]);


  // OPERATIONS


  const deleteOperation = (operation_id: number) => {
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
    }, Info.operations_reload)
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
              <Stack gap={12}>
                <Input
                  img='KeyRound'
                  placeholder="Password"
                  type='password'
                  value={app.general.password}
                  tabIndex={3}
                  onChange={e => Info.setPassword(e.currentTarget.value)} />
                <Button img='LogIn' revert ref={loginButton} loading={loading} tabIndex={4} onClick={login}>Log in</Button>
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
                          <Button tabIndex={i * 1} onClick={() => handleOperationSelect(operation)} img={GlyphMap[operation.glyph_id] || 'ScanSearch'}>{operation.name}</Button>
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