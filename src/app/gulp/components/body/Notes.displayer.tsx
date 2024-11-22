import { File, Note as NoteClass } from "@/class/Info";
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
        if (!File.uuid(app, note._uuid)?.selected) return null;

        const left = getPixelPosition(NoteClass.timestamp(note) + File.uuid(app, note._uuid)!.offset);
        const top = File.getHeight(app, note._uuid, scrollY);

        if (top <= 0) return null;

        return <Note key={note.id} note={note} left={left} top={top} />
      })}
    </Fragment>
  )
}
