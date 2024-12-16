import React from 'react'
import { Limits } from './components/header/Limits'
import { MenuDialog } from './components/header/Menu.dialog'
import { Button } from '@/ui/Button'
import { useApplication } from '@/context/Application.context'
import { Windows } from '@/ui/Windows'

export function GulpPage() {
  const { spawnDialog } = useApplication();

  return (
    <React.Fragment>
      <header>
        <Button img='Menu' onClick={() => spawnDialog(<MenuDialog />)}>Menu</Button>
        <Limits />
      </header>
      <Windows.Provider />
    </React.Fragment>
  )
};
