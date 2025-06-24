import { Note as NoteClass, File, Note } from '@/class/Info'
import { RenderEngine } from '@/class/RenderEngine'
import { useApplication } from '@/context/Application.context'
import { λNote } from '@/dto/Dataset'
import { XY } from '@/dto/XY.dto'
import { Glyph } from '@/ui/Glyph'
import { NotePoint } from '@/ui/Note'
import { useMemo, useCallback, Fragment, useState, useEffect, useRef } from 'react'

interface NotesDisplayerProps {
  getPixelPosition: (num: number) => number;
  self: XY;
}

type NoteMapping = Record<λNote['id'], XY>

export function NotesDisplayer({
  getPixelPosition,
  self
}: NotesDisplayerProps) {
  const { app, scrollY } = useApplication()
  const [notes, setNotes] = useState<λNote[]>([]);

  useEffect(() => {
    if (app.timeline.hidden_notes) {
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
  }, [self, app.target.notes, app.target.files]);

  if (!notes.length) {
    return null;
  }

  return (
    <NotePoint.Point
      type='note'
      key={notes[0].id}
      note={notes.length > 1 ? {
        ...notes[0],
        color: '#e8e8e8',
        name: `${notes.length}`,
        glyph_id: Glyph.getIdByName('Status')
      } : notes[0]}
      x={getPixelPosition(Note.timestamp(notes[0]))}
      y={File.getHeight(app, notes[0].source_id, scrollY)}
    />
  )
}
