import { Note as NoteClass, File } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λNote } from '@/dto/Dataset'
import { XY } from '@/dto/XY.dto'
import { NotePoint } from '@/ui/Note'
import { useMemo, useCallback, Fragment, useState, useEffect } from 'react'

interface NotesDisplayerProps {
  getPixelPosition: (num: number) => number
}

type NoteMapping = Record<λNote['id'], XY>

export function NotesDisplayer({
  getPixelPosition,
}: NotesDisplayerProps) {
  const { app, scrollY } = useApplication()

  if (app.timeline.hidden_notes)
    return null;

  const selectedFiles = useMemo(
    () => new Set(app.target.files.filter((f) => f.selected).map((f) => f.id)),
    [app.target.files],
  )

  const [mapping, setMapping] = useState<NoteMapping>({})

  useEffect(() => {
    setMapping(
      app.target.notes.reduce<NoteMapping>((acc, note) => {
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
  }, [app.target.notes, getPixelPosition, app.timeline.scale])

  const getNotePosition = useCallback(
    (note: λNote) => {
      const pos = mapping[note.id]
      if (!pos) return null

      const top = pos.y
      return pos.x > 0 && top > 0 ? { left: pos.x, top } : null
    },
    [scrollY, app.timeline.filter, mapping],
  )

  const matrix: Map<string, λNote[]> = new Map();

  app.target.notes.filter((note) => selectedFiles.has(note.source_id)).forEach(note => {
    const pos = getNotePosition(note);
    if (!pos) {
      return;
    }

    const key = `${pos.left}|${pos.top}`;

    if (!matrix.has(key)) {
      matrix.set(key, [])
    }

    matrix.get(key)!.push(note)
  })

  return (
    <Fragment>
      {Array.from(matrix.entries()).map(([_, notes]) => {
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
