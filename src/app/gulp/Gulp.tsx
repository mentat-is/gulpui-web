import React from 'react'
import { Body } from './components/body/Body'
import { DataTransfered } from './components/header/DataTransfered'
import { Limits } from './components/header/Limits'
import { Logout } from './components/header/Logout'

export function GulpPage() {

  return (
    <React.Fragment>
      <header>
        <DataTransfered />
        <Limits />
        <Logout />
      </header>
      <Body />
    </React.Fragment>
  )
};
