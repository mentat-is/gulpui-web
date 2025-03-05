import { Note as NoteClass, File } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λNote } from '@/dto/Dataset'
import { XY } from '@/dto/XY.dto'
import { NotePoint } from '@/ui/Note'
import { useMemo, useCallback, Fragment, useState, useEffect } from 'react'

interface NotesDisplayerProps {
  getPixelPosition: (num: number) => number
  scrollY: number
}

type NoteMapping = Record<λNote['id'], XY>

export function NotesDisplayer({
  getPixelPosition,
  scrollY,
}: NotesDisplayerProps) {
  const { app } = useApplication()

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

      const top = pos.y - scrollY
      return pos.x > 0 && top > 0 ? { left: pos.x, top } : null
    },
    [scrollY, mapping],
  )

  if (app.timeline.hidden_notes) return null

  return (
    <Fragment>
      {app.target.notes
        .filter((note) => selectedFiles.has(note.source_id))
        .map((note) => {
          const position = getNotePosition(note)
          return position ? (
            <NotePoint.Point
              key={note.id}
              note={note}
              x={position.left}
              y={position.top}
            />
          ) : null
        })}
    </Fragment>
  )
}
