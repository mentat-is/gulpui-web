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

        const left = getPixelPosition(NoteClass.timestamp(app, note) + File.id(app, note.source_id)!.settings.offset);
        const top = File.getHeight(app, note.source_id, scrollY);

        if (top <= 0) return null;

        return <NotePoint key={note.id} note={note} x={left} y={top} />
      })}
    </Fragment>
  )
}
