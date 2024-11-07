import React, { useEffect } from 'react'
import { Limits } from './components/header/Limits'
import { MenuDialog } from './components/header/Menu.dialog'
import { Button } from '@/ui/Button'
import { useApplication } from '@/context/Application.context'
import { Timeline } from './components/body/Timeline'
import { differenceInMonths } from 'date-fns'

export function GulpPage() {
  const { app, spawnDialog } = useApplication();

  useEffect(() => {
    if (app.target.bucket.timestamp) console.log('Has been defined');
    const { min, max } = app.target.bucket.timestamp;

    const diff = differenceInMonths(max, min);
  }, [app.target.bucket.timestamp]);

  return (
    <React.Fragment>
      <header>
        <Button img='Menu' onClick={() => spawnDialog(<MenuDialog />)}>Menu</Button>
        <Limits />
      </header>
      <Timeline />
    </React.Fragment>
  )
};
