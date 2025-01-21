import s from './styles/Link.module.css';
import { copy } from './utils';
import { Badge } from './Badge';
import { Separator } from './Separator';
import { Button } from '@impactium/components';
import { useApplication } from '@/context/Application.context';
import { Fragment, useEffect, useState } from 'react';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { Icon } from '@impactium/icons';
import { λNote } from '@/dto/Dataset';
import { Note } from '@/class/Info';
import { Point } from './Point';
import { λEvent } from '@/dto/ChunkEvent.dto';

export namespace NotePoint {
  export interface Props extends Omit<Point.Props, 'icon' | 'accent' | 'name'> {
    note: λNote;
  }
}

export function NotePoint({ note, ...props }: NotePoint.Props) {
  const { app, spawnDialog } = useApplication();

  const openEvent = () => {
    const events = Note.events(app, note);

    if (events.length === 0) {
      return null;
    }

    const dialog = events.length === 1
      ? <DisplayEventDialog event={events[0]} />
      : <DisplayGroupDialog events={events} />;

    spawnDialog(dialog);
  };

  return (
    <Point onClick={openEvent} icon={Note.icon(note)} accent={note.color} name={note.name} {...props} />
  )
}

interface NoteContentProps extends Pick<NotePoint.Props, 'note'> {
  loading: boolean;
  deleteNote: () => void;
  openEvent?: () => void;
}

export function NoteContent({ note, loading, deleteNote, openEvent }: NoteContentProps) {
  const { dialog, app } = useApplication();
  const [events, setEvents] = useState<λEvent[]>(Note.events(app, note));

  useEffect(() => {
    setEvents(Note.events(app, note));
  }, [note.docs]);

  return (
    <Fragment>
      <div className={s.general}>
        <div>
          <Icon name='Heading1' />
          <span>Title: </span>
          <p>{note.name}</p>
          {note.name?.length > 128 && <Icon onClick={() => copy(note.name!)} className={s.__copy} name='Copy' />}
        </div>
        <Separator />
        <div>
          <Icon name='Heading2' />
          <span>Text: </span>
          <p>{note.text}</p>
          {note.text?.length > 128 && <Icon onClick={() => copy(note.text!)} className={s.__copy} name='Copy' />}
        </div>
        <Separator />
        {note.description && <Fragment>
          <Separator />
          <div>
            <span>Description: </span>
            <p>{note.description}</p>
            {note.description?.length > 128 && <Icon onClick={() => copy(note.description!)} className={s.__copy} name='Copy' />}
          </div>
        </Fragment>}
      </div>
      {note.tags.filter(t => !!t).length && (
        <Fragment>
          <Separator />
          <div className={s.tags}>
            {note.tags.filter(t => !!t).map(tag => <Badge key={tag} value={tag} />)}
          </div>
        </Fragment>
      )}
      <Separator />
      <div className={s.buttons}>
        <Button className={s.copy} onClick={() => copy(JSON.stringify(note))} img='Copy'>Copy note as JSON</Button>
        <Button loading={loading} img='Trash2' onClick={deleteNote} variant='destructive' />
      </div>
      {events.length && !dialog && <Button className={s.open_event} img='FileSearch' onClick={openEvent}>{events.length === 1 ? 'Open note`s event' : 'Open note`s events group'}</Button>}
    </Fragment>
  )
}
