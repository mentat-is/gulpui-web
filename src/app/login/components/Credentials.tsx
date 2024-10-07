import s from '../Login.module.css'
import React, { useState } from "react";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { useApplication } from "@/context/Application.context";
import { Login } from "@/dto";
import { Separator } from '@/ui/Separator';
import { Label } from '@/ui/Label';
import { toast } from 'sonner';

interface AuthorizationErrors {
  server?: string;
  username?: string;
  password?: string;
}

export function AuthorizationElement() {
  const { Info, app, api } = useApplication();
  const [ loading, setLoading ] = useState<boolean>(false);
  const [serverValue, setServerValue] = useState<string>(app.general.server);
  const [errors, setErrors] = useState<AuthorizationErrors>({});

  const send = async () => {
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
  }

  const removeOverload = (str: string): string => str.endsWith('/')
    ? removeOverload(str.slice(0, -1))
    : str;

  const validate = (str: string): string | void => /^(https?:\/\/)(((\d{1,3}\.){3}\d{1,3})|([\w-]+\.)+[\w-]+)(\/[\w-./?%&=]*)?$/.test(str)
    ? setErrors(e => ({ ...e, server: 'Server URL didn`t match pattern'}))
    : removeOverload(str);

  return (
    <React.Fragment>
    {errors.server && <Label htmlFor='server'>{errors.server}</Label>}
    <Input
      img='Database'
      placeholder="Server adress (ip:port)"
      value={serverValue}
      onChange={(e) => setServerValue(e.currentTarget.value)} />
    {errors.username && <Label htmlFor='server'>{errors.username}</Label>}
    <Input
      img='User'
      placeholder="Username"
      value={app.general.username}
      onChange={e => Info.setUsername(e.currentTarget.value)} />
    {errors.password && <Label htmlFor='server'>{errors.password}</Label>}
    <Input
      img='KeyRound'
      placeholder="Password"
      type='password'
      value={app.general.password}
      onChange={e => Info.setPassword(e.currentTarget.value)} />
    <Separator />
    <div className={s.group}>
      <Button loading={loading} onClick={send}>Log in</Button>
    </div>
  </React.Fragment>
  )
}