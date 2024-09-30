import s from './styles/Link.module.css';
import { cn, copy } from './utils';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Badge } from './Badge';
import { Separator } from './Separator';
import { Button } from './Button';
import { useApplication } from '@/context/Application.context';
import { Fragment, useState } from 'react';
import { Event } from '@/class/Info';
import { DisplayEventDialog } from '@/dialogs/DisplayEventDialog';
import { DisplayGroupDialog } from '@/dialogs/DisplayGroupDialog';
import { Icon } from './Icon';
import { λIcon } from '@/ui/utils';
import { λLink } from '@/dto/Link.dto';

interface LinkProps {
  link: λLink;
  left: number;
  top: number;
}

export function Link({ link, left, top }: LinkProps) {
  const { Info } = useApplication();
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  const deleteLink = async () => {
    setLoading(true);
    await Info.links_delete(link);
    setLoading(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={s.target} style={{ left, top }}>
        <Icon name='Waypoints' />
        <hr style={{ background: link.data.color }} />
      </PopoverTrigger>
      <PopoverContent className={s.content}>
        <LinkContent loading={loading} link={link} setOpen={setOpen} deleteLink={deleteLink} />
      </PopoverContent>
    </Popover>
  )
}

interface LinkContentProps extends Pick<LinkProps, 'link'> {
  loading: boolean;
  deleteLink: () => void;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function LinkContent({ link, setOpen, loading, deleteLink }: LinkContentProps) {
  const { app, spawnDialog, dialog } = useApplication();
  const [fulfill, setFulfill] = useState<boolean>(false);

  const openEvent = () => {
    const events = Event.findByIdAndUUID(app, link.events[0]._id, link._uuid);

    const dialog = events.length === 1
      ? <DisplayEventDialog event={events[0]} />
      : <DisplayGroupDialog events={events} />;

    spawnDialog(dialog);
    setOpen(false);
  };

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
        {/* <div>
          <Icon name='User' />
          <span>Owner ID: </span>
          <p>{link.owner_user_id}</p>
        </div>
        <Separator /> */}
        <div>
          <Icon name={link.private ? 'LockKeyhole' : 'LockKeyholeOpen'} />
          <span>{link.private ? 'Private' : 'Not private'}</span>
        </div>
        {link.description && <Fragment>
          <Separator />
          <div>
            <span>Description: </span>
            <p>{link.description}</p>
            {link.description?.length > 128 && <Icon onClick={() => copy(link.description!)} className={s.__copy} name='Copy' />}
          </div>
        </Fragment>}
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
      {!!link.events.length && !dialog && <Button className={s.open_event} img='FileSearch' onClick={openEvent}>{link.events.length === 1 ? 'Open note`s event' : 'Open note`s events group'}</Button>}
    </Fragment>
  )
}
