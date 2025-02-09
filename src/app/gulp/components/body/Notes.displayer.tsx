import { Note as NoteClass, File } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { λNote } from '@/dto/Dataset';
import { NotePoint } from '@/ui/Note';
import { useMemo, useCallback } from 'react';

interface NotesDisplayerProps {
  getPixelPosition: (num: number) => number;
  scrollY: number;
}

export function NotesDisplayer({ getPixelPosition, scrollY }: NotesDisplayerProps) {
  const { Info, app } = useApplication();

  const selectedFiles = useMemo(() => new Set(app.target.files.filter(f => f.selected).map(f => f.id)), [app.target.files]);

  const getNotePosition = useCallback((note: λNote) => {
    const timestamp = NoteClass.timestamp(app, note);
    if (!timestamp) return null;

    const left = getPixelPosition(timestamp);
    const top = File.getHeight(app, note.source_id, scrollY);

    return left > 0 && top > 0 ? { left, top } : null;
  }, [getPixelPosition, scrollY, app]);

  return (
    <>
      {app.target.notes.filter(note => selectedFiles.has(note.source_id)).map(note => {
        const position = getNotePosition(note);
        if (!position) return null;

        return (
          <NotePoint.Point note={note} x={position.left} y={position.top} deleteObject={() => Info.note_delete(note)} editObject={() => {}} />
        );
      })}
    </>
  );
}
