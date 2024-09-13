import { useEffect, useState } from "react";
import Cookies from "universal-cookie";
import s from './Login.module.css';

import { useApplication } from "@/context/Application.context";
import { parseTokensFromCookies } from '@/ui/utils'
import { Page } from "@/components/Page";
import { Card } from "@/ui/Card";

import { OperationsChooser } from "./components/Operation";
import { IndexesChooser } from "./components/Index";
import { SessionsChooser } from "./components/Session";
import { AuthorizationElement } from "./components/Credentials";
import { Sessions } from "@/dto/Session.dto";
import { Index, Operation } from "@/class/Info";

export function LoginPage() {
  const { Info, app, spawnBanner } = useApplication();
  const cookie = new Cookies();
  const [sessions, setSessions] = useState<Sessions>(parseTokensFromCookies(cookie.get('sessions')));
  
  useEffect(() => {
    if (app.general.token) Info.index_reload();
  }, [app.general.token]);

  useEffect(() => {
    if (app.general.token && Index.selected(app)) Info.operations_reload();
  }, [app.target.indexes]);

  useEffect(() => {
    if (!app.general.token || !app.general.server || !Index.selected(app)) return;

    !sessions.find(session => session.token === app.general.token) && sessions.push({
      token: app.general.token,
      server: app.general.server,
      expires: app.general.expires!
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
  
  return (
    <Page options={{ center: true }} className={s.page}>
      <Card className={s.wrapper}>
        <div className={s.logo}>
          <img className={s.logo} src='https://cdn.impactium.fun/mentat/gulp-no-text.svg' alt='' />
          Gulp
          <i>Web Client</i>
        </div>
        {!app.general.token || !app.target.indexes.length
          ? <AuthorizationElement />
          : (!Index.selected(app) || !app.target.operations.length
            ? <IndexesChooser />
            : (!Operation.selected(app)
                ? <OperationsChooser />
                : null
              )
        )}
      </Card>
      {!!sessions.length && (!app.general.token || !app.target.indexes.length) && <SessionsChooser sessions={sessions} setSessions={setSessions} />}
    </Page>
  )
}