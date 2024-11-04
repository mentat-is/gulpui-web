import React, { useEffect } from 'react'
import { Limits } from './components/header/Limits'
import { MenuDialog } from './components/header/Menu.dialog'
import { Button } from '@/ui/Button'
import { useApplication } from '@/context/Application.context'
import { Timeline } from './components/body/Timeline'
import { differenceInMonths } from 'date-fns'
import { LimitsBanner } from '@/banners/Limits.banner'

export function GulpPage() {
  const { app, spawnDialog, spawnBanner, Info } = useApplication();

  useEffect(() => {
    const { min, max } = app.target.bucket.timestamp;

    const diff = differenceInMonths(max, min);

    if (diff > 1 && !app.target.bucket.selected) {
      // spawnBanner(<LimitsBanner />)
    }
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
