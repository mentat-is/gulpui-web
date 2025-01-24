import s from './styles/Link.module.css';
import { copy } from './utils';
import { Badge } from './Badge';
import { Separator } from './Separator';
import { Button } from '@impactium/components';
import { useApplication } from '@/context/Application.context';
import { Fragment, useEffect, useState } from 'react';
import { Event, Link, Note } from '@/class/Info';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { Icon } from '@impactium/icons';
import { λLink } from '@/dto/Dataset';
import { Point } from './Point';
import { λEvent } from '@/dto/ChunkEvent.dto';
import { Glyph } from './Glyph';

export namespace LinkPoint {
  export interface Props extends Omit<Point.Props, 'icon' | 'name' | 'accent'> {
    link: λLink
  }
}

export function LinkPoint({ link, ...props }: LinkPoint.Props) {
  const { app, spawnDialog } = useApplication();

  const openEvent = () => {
    if (link.docs.length === 0) {
      return null;
    }

    const dialog = link.docs.length === 1
      ? <DisplayEventDialog event={Event.id(app, link.docs[0].id)} />
      : <DisplayGroupDialog events={link.docs.map(doc => Event.id(app, doc.id))} />;s

    spawnDialog(dialog);
  };

  

  return (
    <Point onClick={openEvent} icon={Link.icon(link)} name={link.name} accent={link.color} {...props} />
  )
}
