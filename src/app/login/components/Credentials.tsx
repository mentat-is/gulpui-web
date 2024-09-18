import s from '../Login.module.css'
import React, { useState } from "react";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Login } from "@/dto";
import { Separator } from '@/ui/Separator';

export function AuthorizationElement() {
  const { Info, app, api } = useApplication();
  const [ loading, setLoading ] = useState<boolean>(false);

  const send = async () => {
    setLoading(true);
    await api<Login>('/login', {
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
      }
    });
    setLoading(false);
  }

  return (
    <React.Fragment>
    <Input
      img='https://cdn.impactium.fun/ui/specific/data.svg'
      placeholder="Server adress (ip:port)"
      value={app.general.server}
      onChange={e => Info.setServer(e.currentTarget.value)} />
    <Input
      img='https://cdn.impactium.fun/ui/user/user.svg'
      placeholder="Username"
      value={app.general.username}
      onChange={e => Info.setUsername(e.currentTarget.value)} />
    <Input
      img='https://cdn.impactium.fun/ui/specific/key.svg'
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