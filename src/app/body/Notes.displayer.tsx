import { Note as NoteClass, File, Note } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λNote } from '@/dto/Dataset'
import { XY } from '@/dto/XY.dto'
import { NotePoint } from '@/ui/Note'
import { useMemo, useCallback, Fragment, useState, useEffect, useRef } from 'react'

interface NotesDisplayerProps {
  getPixelPosition: (num: number) => number
}

type NoteMapping = Record<λNote['id'], XY>

export function NotesDisplayer({
  getPixelPosition,
}: NotesDisplayerProps) {
  const { app, scrollY } = useApplication()
  const [notes, setNotes] = useState<λNote[]>([]);

  useEffect(() => {
    setNotes(app.timeline.hidden_notes ? [] : Note.selected(app).filter((note) => !note.tags.includes('auto')));
  }, [app.target.notes, app.target.notes.length, app.target.files, app.target.files.length, app.timeline.hidden_notes]);

  const [mapping, setMapping] = useState<NoteMapping>({})

  useEffect(() => {
    setMapping(
      notes.reduce<NoteMapping>((acc, note) => {
        const timestamp = NoteClass.timestamp(app, note)
        if (timestamp) {
          acc[note.id] = {
            x: getPixelPosition(timestamp),
            y: File.getHeight(app, note.source_id, 0),
          }
        }
        return acc
      }, {}),
    )
  }, [notes, app.timeline.scale, getPixelPosition])

  const getNotePosition = useCallback(
    (note: λNote) => {
      const pos = mapping[note.id]
      if (!pos) return null

      const top = pos.y
      return pos.x > 0 && top > 0 ? { left: pos.x, top } : null
    },
    [scrollY, app.timeline.filter, mapping],
  )

  const matrix = useRef<Map<string, λNote[]>>(new Map());

  useEffect(() => {
    matrix.current.clear()
    notes.forEach(note => {
      const pos = getNotePosition(note);
      if (!pos) {
        return;
      }

      const key = `${pos.left}|${pos.top}`;

      if (!matrix.current.has(key)) {
        matrix.current.set(key, [])
      }

      matrix.current.get(key)!.push(note)
    })
  }, [getNotePosition, notes]);

  return (
    <Fragment>
      {Array.from(matrix.current.entries()).map(([_, notes]) => {
        if (notes.length === 1) {
          const note = notes[0]
          const pos = getNotePosition(note);
          if (!pos) {
            return null
          }

          return (
            <NotePoint.Point
              type='note'
              key={note.id}
              note={note}
              x={pos.left}
              y={pos.top - scrollY}

            />
          )
        }

        const nums = _.split('|').map(x => parseInt(x));

        return (
          <NotePoint.Group type='note' notes={notes} x={nums[0]} y={nums[1]} />
        )
      })}
    </Fragment>
  )
}
