import { useApplication } from '@/context/Application.context';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { λNote } from '@/dto/Dataset';
import { Note } from '@/class/Info';
import { Point } from './Point';

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
