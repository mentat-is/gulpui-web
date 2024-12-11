import { Pattern } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Separator } from "@/ui/Separator";
import { Stack } from "@impactium/components";
import { Toggle } from "@/ui/Toggle";
import { useEffect, useReducer, useState } from "react";

export function QueryExternalBanner() {
  const { Info } = useApplication();
  const [server, setServer] = useState<string>('');
  const [isServerValid, setIsServerValid] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [isUsernameValid, setIsUsernameValid] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');
  const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSplunk, toggleIsSplunk] = useReducer((state: boolean) => !state, false);

  // @ts-ignore
  const stackProps: Stack.Props = ({
    ai: 'center',
    gap: 12
  });

  useEffect(() => {
    setIsServerValid(true);
  }, [server]);

  useEffect(() => {
    setIsUsernameValid(true);
  }, [username]);

  useEffect(() => {
    setIsPasswordValid(true);
  }, [password]);

  const query = async () => {
    setLoading(true);

    let err = null;
    if (!Pattern.Server.test(server)) {
      setIsServerValid(false);
      err = true;
    }
    if (!Pattern.Username.test(username)) {
      setIsUsernameValid(false);
      err = true;
    }
    if (!Pattern.Password.test(password)) {
      setIsPasswordValid(false);
      err = true;
    }
    if (err) return;
    
    await Info.query_external({
      server,
      username,
      password,
      operation_id: 0,
      plugin: ''
    });
    setLoading(false);
  }

  return (
    <Banner title='Query External Resourse'>
      <Stack ai='center'>
        <p>Plugin:</p>
        <Toggle option={['OpenSearch', 'Splunk']} checked={isSplunk} onCheckedChange={toggleIsSplunk} />
      </Stack>
      <Card>
        <Stack {...stackProps}>
          <Label style={{ minWidth: 80 }} htmlFor='server'>Server:</Label>
          <Input
            placeholder='Server address (ex. 123.12.1.12:8080)'
            img='FunctionPython'
            id='server'
            valid={isServerValid}
            value={server}
            onChange={e => setServer(e.target.value)} />
        </Stack>
        <Stack {...stackProps}>
          <Label style={{ minWidth: 80 }} htmlFor='username'>Username:</Label>
          <Input
            placeholder='Username'
            img='User'
            id='username'
            valid={isUsernameValid}
            value={username}
            onChange={e => setUsername(e.target.value)} />
        </Stack>
        <Stack {...stackProps}>
          <Label style={{ minWidth: 80 }} htmlFor='password'>Password:</Label>
          <Input
            placeholder='Password'
            img='KeyRound'
            id='password'
            valid={isPasswordValid}
            value={password}
            onChange={e => setPassword(e.target.value)} />
        </Stack>
      </Card>
      <Separator />
      <Card>
        <Toggle option={['Select from limits', 'ISO String']} />
        
      </Card>
      <Button loading={loading} img='CheckCheck' onClick={query}>Apply query</Button>
    </Banner>
  )
}