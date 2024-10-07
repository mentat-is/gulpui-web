import React, { useEffect, useState } from 'react'
import { Header } from './components/header/Header'
import { Body } from './components/body/Body'
import { useApplication } from '@/context/Application.context'
import { SelectContextBanner } from '@/banners/SelectContextBanner';
import { AppSocket } from '@/class/AppSocket';
import { File } from '@/class/Info';
import { toast } from 'sonner';

export function GulpPage() {
  const { app, spawnBanner, Info, api, setWs } = useApplication();
  const [rendered, setRendered] = useState<number>(0);

  useEffect(() => {
    const files = File.selected(app);

    if (!files.length || app.target.files.length === rendered) return;

    setRendered(File.selected(app).length);

    setWs(new AppSocket(Info, app));

    Info.refetch();
  }, [app.target.files, app.target.contexts]);

  return (
    <React.Fragment>
      <Header />
      <Body />
    </React.Fragment>
  )
};
