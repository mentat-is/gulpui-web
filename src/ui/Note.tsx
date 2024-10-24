import { λNote } from '@/dto/Note.dto';
import s from './styles/Link.module.css';
import { copy } from './utils';
import { Badge } from './Badge';
import { Separator } from './Separator';
import { Button } from './Button';
import { useApplication } from '@/context/Application.context';
import { Fragment } from 'react';
import { DisplayEventDialog } from '@/dialogs/DisplayEventDialog';
import { DisplayGroupDialog } from '@/dialogs/DisplayGroupDialog';
import { Icon } from './Icon';
import { λIcon } from '@/ui/utils';

interface NoteProps {
  note: λNote;
  left: number;
  top: number;
}

export function Note({ note, left, top }: NoteProps) {
  const { spawnDialog } = useApplication();

  const iconMap: Array<λIcon> = [
    'Bookmark',
    'TriangleAlert',
    'SquareX'
  ];

  const openEvent = () => {
    const dialog = note.events.length === 1
      ? <DisplayEventDialog event={note.events[0]} />
      : <DisplayGroupDialog events={note.events} />;

    spawnDialog(dialog);
  };

  return (
    <>
      <Button onClick={openEvent} size='icon' variant={'glass'} className={s.target} style={{ left, top }}>
        <Icon name={iconMap[note.level]} />
        <hr style={{ background: note.data.color }} />
      </Button>
      <p className={s.desc} style={{ left, top: top+26 }}>{note.name}</p>
    </>
  )
}

interface NoteContentProps extends Pick<NoteProps, 'note'> {
  loading: boolean;
  deleteNote: () => void;
  openEvent?: () => void;
}

export function NoteContent({ note, loading, deleteNote, openEvent }: NoteContentProps) {
  const { dialog } = useApplication();

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
        <div>
          <Icon name={note.private ? 'LockKeyhole' : 'LockKeyholeOpen'} />
          <span>{note.private ? 'Private' : 'Not private'}</span>
        </div>
        {note.description && <Fragment>
          <Separator />
          <div>
            <span>Description: </span>
            <p>{note.description}</p>
            {note.description?.length > 128 && <Icon onClick={() => copy(note.description!)} className={s.__copy} name='Copy' />}
          </div>
        </Fragment>}
      </div>
      {!!note.tags?.filter(t => !!t).length && (
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
      {!!note.events.length && !dialog && <Button className={s.open_event} img='FileSearch' onClick={openEvent}>{note.events.length === 1 ? 'Open note`s event' : 'Open note`s events group'}</Button>}
    </Fragment>
  )
}
