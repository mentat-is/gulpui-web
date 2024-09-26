import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Session, Sessions } from "@/dto/Session.dto";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import s from '../Login.module.css'
import { useState } from "react";
import Cookies from "universal-cookie";

interface SessionsChooserProps {
  sessions: Sessions;
  setSessions: React.Dispatch<React.SetStateAction<Sessions>>
}

export function SessionsChooser({ sessions, setSessions }: SessionsChooserProps) {
  const { lang } = useLanguage();
  const { Info, app } = useApplication()
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const awaitResponse = (token: string) => setLoading(prevLoading => ({ ...prevLoading, [token]: true }));

  const handleSessionButtonClick = (session: Session) => {
    awaitResponse(session.token)
    Info.setToken(session.token);
    Info.setServer(session.server);
    Info.setExpire(session.expires);
    setTimeout(() => {
      deleteSession(session);
    }, 2000);
  }

  const deleteSession = (session: Session) => {
    setSessions((sessions) => {
      const newSessions = sessions.filter(s => s.token !== session.token);
      new Cookies().set('sessions', newSessions);
      return newSessions
    });
  }
  
  return (
    <Card className={s.sessions}>
      <h6>{lang.choose_session}</h6>
      {sessions.map(session => (
        <div className={s.sessions_wrapper} key={session.token}>
          <Button
            loading={loading[session.token]}
            className={s.select_session}
            img='KeyRound'
            onClick={() => handleSessionButtonClick(session)}>
            <div>
              <p>{session.server}</p>
              <p>{session.token}</p>
            </div>
          </Button>
          <Button className={s.delete} onClick={() => deleteSession(session)} img='X' />
        </div>
      ))}
    </Card>
  )
}