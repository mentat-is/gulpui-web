import s from './styles/Link.module.css';
import { copy } from './utils';
import { Badge } from './Badge';
import { Separator } from './Separator';
import { Button } from './Button';
import { useApplication } from '@/context/Application.context';
import { Fragment } from 'react';
import { Event } from '@/class/Info';
import { DisplayEventDialog } from '@/dialogs/DisplayEventDialog';
import { DisplayGroupDialog } from '@/dialogs/DisplayGroupDialog';
import { Icon } from './Icon';
import { λLink } from '@/dto/Link.dto';

interface LinkProps {
  link: λLink;
  left: number;
  top: number;
}

export function Link({ link, left, top }: LinkProps) {
  const { app, spawnDialog } = useApplication();

  const openEvent = () => {
    const events = link.events.map(event => Event.findByIdAndUUID(app, event._id, event._uuid)).flat()

    const dialog = events.length === 1
      ? <DisplayEventDialog event={events[0]} />
      : <DisplayGroupDialog events={events} />;

    spawnDialog(dialog);
  };


  return (
    <>
      <Button size='icon' variant='glass' onClick={openEvent} className={s.target} style={{ left, top }}>
        <Icon name='Waypoints' />
        <hr style={{ background: link.data.color }} />
      </Button>
      <p className={s.desc} style={{ left, top: top+26 }}>{link.name}</p>
    </>
  )
}

interface LinkContentProps extends Pick<LinkProps, 'link'> {
  loading: boolean;
  deleteLink: () => void;
}

export function LinkContent({ link, loading, deleteLink }: LinkContentProps) {
  const { dialog } = useApplication();

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
          <p>{link.text}</p>
          {(link.text || '').length > 128 && <Icon onClick={() => copy(link.text!)} className={s.__copy} name='Copy' />}
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
        <div>
          <Icon name={link.private ? 'LockKeyhole' : 'LockKeyholeOpen'} />
          <span>{link.private ? 'Private' : 'Not private'}</span>
        </div>
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
      {!!link.events.length && !dialog && <Button className={s.open_event} img='FileSearch'>{link.events.length === 1 ? 'Open link`s event' : 'Open link`s events group'}</Button>}
    </Fragment>
  )
}
