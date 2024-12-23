import { Banner } from "@/ui/Banner";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Stack, Button } from "@impactium/components";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import s from './styles/SaveSession.module.css';
import { useApplication } from "@/context/Application.context";
import { Operation } from "@/class/Info";
import { toast } from "sonner";

export function SaveSession() {
  const [sessionName, setSessionName ] = useState<string>('');
  const { api, app, Info, logout } = useApplication();
  const [loading, setLoading] = useState<boolean>(false);

  const changeSessionNameHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setSessionName(value);
  }

  const saveSession = async () => {
    const operation = Operation.selected(app);

    if (!operation) {
      return;
    }

    setLoading(true);

    const resp = await api('/user_data_create', {
      method: 'POST',
      data: {
        name: sessionName,
        user_id: app.general.user_id,
        operation_id: operation.id,
      },
      body: JSON.stringify(Info.getUserData()),
    });

    setLoading(false);

    if (resp.isSuccess()) {
      logout();
      return;
    }

    toast('Cannot save data', {
      description: `Cannot allocate data settings: ${resp.data.name}`
    });
  }

  const isButtonClickable = sessionName.length > 0;

  const save_button = useRef<HTMLButtonElement>(null);

  const enterKeyPressHandler = (event: KeyboardEvent) => {
    if (!isButtonClickable || !save_button.current) {
      return;
    }

    event.preventDefault();

    save_button.current.click();
  }

  useEffect(() => {
    window.addEventListener('keypress', enterKeyPressHandler);

    return () => {
      window.removeEventListener('keypress', enterKeyPressHandler);
    }
  }, [save_button]);

  const done = (
    <Button ref={save_button} img='Check' onClick={saveSession} variant='glass' disabled={!isButtonClickable} loading={loading} />
  )

  return (
    <Banner title='Save session' done={done}>
      <Stack className={s.param}>
        <Label className={s.nameLabel} htmlFor='session_name'>Session name:</Label>
        <Input img='TextHeading' id='session_name' className={s.inp} value={sessionName} onChange={changeSessionNameHandler} />
      </Stack>
    </Banner>
  )
}