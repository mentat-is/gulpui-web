import { Note as NoteClass, File } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { NotePoint } from '@/ui/Note';
import { Fragment } from 'react';


interface NotesDisplayerProps {
  getPixelPosition: (num: number) => number;
  scrollY: number;
}

export function NotesDisplayer({ getPixelPosition, scrollY }: NotesDisplayerProps) {
  const { app } = useApplication();

  return (
    <Fragment>
      {app.target.notes.map(note => {
        if (!File.id(app, note.source_id)?.selected) return null;

        const timestamp = NoteClass.timestamp(app, note);

        if (!timestamp) {
          return null;
        }

        const left = getPixelPosition(timestamp);

        const top = File.getHeight(app, note.source_id, scrollY);

        if (top <= 0) return null;

        return <NotePoint.Point key={note.id} note={note} x={left} y={top} />
      })}
    </Fragment>
  )
}
