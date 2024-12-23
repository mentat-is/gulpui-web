import { useApplication } from "@/context/Application.context";
import { Session, λApp } from "@/dto/App.dto";
import { Banner } from "@/ui/Banner";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/ui/Select";
import { Button } from "@impactium/components";
import { useEffect, useRef, useState } from "react";

export namespace SelectSession {
  export interface Props {
    sessions: λApp['general']['sessions'];
  }
}

export function SelectSession({ sessions }: SelectSession.Props) {
  const { destroyBanner, Info } = useApplication();
  const [selectedSession, setSelectedSession] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);

  const save = () => {
    if (!selectedSession) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      Info.setCurrentSessionOptions(sessions[selectedSession])
    }, 500);
    destroyBanner();
  }

  const done_ref = useRef<HTMLButtonElement>(null);

  const enterKeyboardEventHandler = (event: KeyboardEvent) => {
    if (!selectedSession || !done_ref.current) {
      return;
    }

    event.preventDefault();

    done_ref.current.click();
  }

  useEffect(() => {

    window.addEventListener('keypress', enterKeyboardEventHandler);

    return () => {
      window.removeEventListener('keypress', enterKeyboardEventHandler);
    }
  }, []);

  const done = <Button img='Check' variant='glass' onClick={save} disabled={!selectedSession} ref={done_ref} />

  return (
    <Banner title='Select session' done={done}>
      <Select value={selectedSession} onValueChange={setSelectedSession}>
        <SelectTrigger value={selectedSession}>{selectedSession}</SelectTrigger>
        <SelectContent>
          {Object.keys(sessions).map(name => <SelectItem value={name} onClick={() => setSelectedSession(name)}>{name}</SelectItem>)}
        </SelectContent>
      </Select>
    </Banner>
  )
}