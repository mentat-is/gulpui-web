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
    const events = Link.events(app, link);

    if (events.length === 0) {
      return null;
    }

    const dialog = events.length === 1
      ? <DisplayEventDialog event={events[0]} />
      : <DisplayGroupDialog events={events} />;

    spawnDialog(dialog);
  };

  

  return (
    <Point onClick={openEvent} icon={Link.icon(link)} name={link.name} accent={link.color} {...props} />
  )
}

interface LinkContentProps extends Pick<LinkPoint.Props, 'link'> {
  loading: boolean;
  deleteLink: () => void;
}

export function LinkContent({ link, loading, deleteLink }: LinkContentProps) {
  const { dialog, app } = useApplication();
  const [events, setEvents] = useState<λEvent[]>(Link.events(app, link));
  
    useEffect(() => {
      setEvents(Link.events(app, link));
    }, [link]);

  return (
    <Fragment>
      <div className={s.general}>
        <div>
          <Icon name='Heading1' />
          <span>Title: </span>
          <p>{link.name}</p>
          {(link.name || '').length > 128 && <Icon onClick={() => copy(link.name!)} className={s.__copy} name='Copy' />}
        </div>
        <Separator />
        <div>
          <Icon name='Heading2' />
          <span>Text: </span>
          <p>{link.description}</p>
          {(link.description || '').length > 128 && <Icon onClick={() => copy(link.description!)} className={s.__copy} name='Copy' />}
        </div>
        <Separator />
        {link.description &&
          <Fragment>
            <div>
              <Icon name='CircleHelp' />
              <span>Description: </span>
              <p>{link.description}</p>
              {link.description?.length > 128 && <Icon onClick={() => copy(link.description!)} className={s.__copy} name='Copy' />}
            </div>
            <Separator />
          </Fragment>
        }
      </div>
      {!!(link.tags || []).filter(t => !!t).length && (
        <Fragment>
          <Separator />
          <div className={s.tags}>
            {link.tags!.filter(t => !!t).map(tag => <Badge key={tag} value={tag} />)}
          </div>
        </Fragment>
      )}
      <Separator />
      <div className={s.buttons}>
        <Button className={s.copy} onClick={() => copy(JSON.stringify(link))} img='Copy'>Copy note as JSON</Button>
        <Button loading={loading} img='Trash2' onClick={deleteLink} variant='destructive' />
      </div>
      {events.length && !dialog && <Button className={s.open_event} img='FileSearch'>{events.length === 1 ? 'Open link`s event' : 'Open link`s events group'}</Button>}
    </Fragment>
  )
}
