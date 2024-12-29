import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Button } from "@impactium/components";
import { useCallback, useRef, useState } from "react";
import { AuthBanner } from "./Auth.banner";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/ui/Select";

export namespace SessionBanner {
  export interface Props extends Banner.Props {

  }
}

export function SessionBanner({ ...props }: SessionBanner.Props) {
  const { spawnBanner, destroyBanner, Info } = useApplication();
  const [selectedSession, setSelectedSession] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const done_ref = useRef<HTMLButtonElement>(null);

  const save = () => {
    if (!selectedSession) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      Info.setCurrentSessionOptions(Info.app.general.sessions[selectedSession])
    }, 500);
    destroyBanner();
  }

  

  const BackToAuthorization = useCallback(() => {
    const handleSubtitleButtonClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();

      spawnBanner(<AuthBanner />)
    }

    return (
      <Button variant='ghost' onClick={handleSubtitleButtonClick}>
        Back to authorization
      </Button>
    )
  }, []);

  const DoneButton = useCallback(() => {
    return <Button img='Check' variant='glass' onClick={save} disabled={!selectedSession} ref={done_ref} />
  }, [save, selectedSession, done_ref, loading]);

  const sessions = Object.keys(Info.app.general.sessions);

  return (
    <Banner title='Choose session' subtitle={<BackToAuthorization />} done={<DoneButton />} {...props}>
      <Select value={selectedSession} onValueChange={setSelectedSession}>
        <SelectTrigger value={selectedSession}>{selectedSession || 'No session selected'}</SelectTrigger>
        <SelectContent>
          {sessions.length ? sessions.map(name => <SelectItem value={name} onClick={() => setSelectedSession(name)}>{name}</SelectItem>) : <SelectItem disabled value='X'>No sessions available</SelectItem>}
        </SelectContent>
      </Select>
    </Banner>
  )
}