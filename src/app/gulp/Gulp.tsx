import React, { useState } from 'react'
import { Body } from './components/body/Body'
import { DataTransfered } from './components/header/DataTransfered'
import { Limits } from './components/header/Limits'
import { Logout } from './components/header/Logout'
import { Menu } from './components/header/Menu'
import { Button } from '@/ui/Button'

export function GulpPage() {
  const [active, setActive] = useState(false);

  return (
    <React.Fragment>
      <header>
        <Menu active={active} />
        <Button img='Menu' onClick={() => setActive(!active)}>Menu</Button>
        <Limits />
        <Logout />
      </header>
      <Body />
    </React.Fragment>
  )
};
