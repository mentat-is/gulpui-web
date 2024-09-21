import { λNote } from '@/dto/Note.dto';
import s from './styles/Note.module.css';
import { cn, copy } from './utils';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Badge } from './Badge';
import { Separator } from './Separator';
import { Button } from './Button';
import { useApplication } from '@/context/Application.context';
import { Fragment, useState } from 'react';
import { Event, Note as NoteClass } from '@/class/Info';
import { DisplayEventDialog } from '@/dialogs/DisplayEventDialog';
import { λEvent } from '@/dto/ChunkEvent.dto';
import { DisplayGroupDialog } from '@/dialogs/DisplayGroupDialog';

interface NoteProps {
  note: λNote;
  left: number;
  top: number;
}

export function Note({ note, left, top }: NoteProps) {
  const { api, app, Info, spawnDialog } = useApplication();
  const [loading, setLoading] = useState<boolean>(false);

  const icon = [
    'specific/bookmark.svg',
    'triangle/warning.svg',
    'close/square.svg'
  ][note.level];

  const deleteNote = async () => {
    setLoading(true);
    await Info.notes_delete(note);
    setLoading(false);
  }

  return (
    <Popover>
      <PopoverTrigger className={cn(s.note)} style={{ left, top }}>
        <img src={`https://cdn.impactium.fun/ui/${icon}`} alt='' />
        <hr style={{ background: note.data.color }} />
      </PopoverTrigger>
      <PopoverContent className={s.content}>
        <NoteContent loading={loading} note={note} deleteNote={deleteNote} />
      </PopoverContent>
    </Popover>
  )
}

interface NoteContentProps extends Pick<NoteProps, 'note'> {
  loading: boolean;
  deleteNote: () => void;
}

export function NoteContent({ note, loading, deleteNote }: NoteContentProps) {
  const { app, spawnDialog, dialog } = useApplication();

  const openEvent = () => {
    const events = Event.findByIdAndUUID(app, note.events[0]._id, note._uuid);

    const dialog = events.length === 1
      ? <DisplayEventDialog event={events[0]} />
      : <DisplayGroupDialog events={events} />;

    spawnDialog(dialog)
  };

  return (
    <Fragment>
      <div className={s.general}>
        <p>
          <img src='https://cdn.impactium.fun/ui/heading/h1.svg' />
          <span>Title: </span>
          {note.name}
        </p>
        <Separator />
        <p>
          <img src='https://cdn.impactium.fun/ui/heading/h2.svg' />
          <span>Text: </span>
          {note.text}
        </p>
        <Separator />
        <p>
          <img src='https://cdn.impactium.fun/ui/user/user.svg' />
          <span>Owner ID: </span>
          {note.owner_user_id}
        </p>
        <Separator />
        <p>
          <img src={`https://cdn.impactium.fun/ui/lock/${note.private ? 'lock' : 'open'}.svg`} />
          <span>{note.private ? 'Private' : 'Not private'}</span>
        </p>
        {note.description && <Fragment>
          <Separator />
          <p>
            <span>Description: </span>
            {note.description}
          </p>
        </Fragment>}
      </div>
      {!!note.tags.filter(t => !!t).length && (
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
      {!!note.events.length && !dialog && <Button img='FileSearch' onClick={openEvent}>{note.events.length === 1 ? 'Open note`s event' : 'Open note`s events group'}</Button>}
    </Fragment>
)
}