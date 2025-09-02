import { Note as NoteClass, File, Note, Event } from '@/class/Info'
import { RenderEngine } from '@/class/RenderEngine'
import { useApplication } from '@/context/Application.context'
import { λNote } from '@/dto/Dataset'
import { XY } from '@/dto/XY.dto'
import { NotePoint } from '@/ui/Note'
import { useState, useEffect } from 'react'

interface NotesDisplayerProps {
  getPixelPosition: (num: number) => number;
  self: XY;
}

export function NotesDisplayer({
  getPixelPosition,
  self
}: NotesDisplayerProps) {
  const { app, scrollY } = useApplication()
  const [notes, setNotes] = useState<λNote[]>([]);

  useEffect(() => {
    if (app.hidden.notes) {
      return setNotes([]);
    }
    const files = File.selected(app);
    const index = Math.floor((self.y + scrollY) / 48);
    const file = files[index];

    if (!file) {
      return setNotes([]);
    }

    const notes = RenderEngine.getNotesByX(file, self.x);
    setNotes(notes);
  }, [self, app.target.notes, app.target.files, app.hidden.notes]);

  return notes.length > 0 ? (
    <NotePoint.Point
      type='note'
      key={notes[0].id}
      notes={notes}
      x={getPixelPosition(Note.timestamp(notes[0]))}
      y={File.getHeight(app, notes[0].source_id, scrollY)}
    />
  ) : null
}
