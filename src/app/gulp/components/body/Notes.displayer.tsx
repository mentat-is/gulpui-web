import { Note as NoteClass, Source } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Note } from "@/ui/Note";
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
        if (!Source.id(app, note.source_id)?.selected) return null;

        const left = getPixelPosition(NoteClass.timestamp(note) + Source.id(app, note.source_id)!.settings.offset);
        const top = Source.getHeight(app, note.source_id, scrollY);

        if (top <= 0) return null;

        return <Note key={note.id} note={note} left={left} top={top} />
      })}
    </Fragment>
  )
}
