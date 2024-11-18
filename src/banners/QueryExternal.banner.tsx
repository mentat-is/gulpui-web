import { Pattern } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Separator } from "@/ui/Separator";
import { Stack, StackProps } from "@/ui/Stack";
import { Toggle } from "@/ui/Toggle";
import { useEffect, useState } from "react";

interface QueryExternalBannerProps {

}

export function QueryExternalBanner({}: QueryExternalBannerProps) {
  const { Info } = useApplication();
  const [server, setServer] = useState<string>('');
  const [isServerValid, setIsServerValid] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [isUsernameValid, setIsUsernameValid] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');
  const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const stackProps: StackProps = ({
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
    if (!Pattern.Server.test(server)) {
      setIsServerValid(false);
    }
    if (!Pattern.Username.test(username)) {
      setIsUsernameValid(false);
    }
    if (!Pattern.Password.test(password)) {
      setIsPasswordValid(false);
    }

    setLoading(true);
    Info.query_external({
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
      <Button loading={loading} img='CheckCheck'>Apply query</Button>
    </Banner>
  )
}