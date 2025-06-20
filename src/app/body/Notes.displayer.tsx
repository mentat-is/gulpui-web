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

  const mapping = useMemo<NoteMapping>(() => {
    return notes.reduce<NoteMapping>((acc, note) => {
      const timestamp = NoteClass.timestamp(app, note)
      if (timestamp) {
        acc[note.id] = {
          x: getPixelPosition(timestamp),
          y: File.getHeight(app, note.source_id, 0),
        }
      }
      return acc
    }, {})
  }, [notes, app.timeline.scale, getPixelPosition, app])

  const getNotePosition = useCallback(
    (note: λNote) => {
      const pos = mapping[note.id]
      if (!pos) return null

      const top = pos.y
      return pos.x > 0 && top > 0 ? { left: pos.x, top } : null
    },
    [mapping], // Убираем лишние зависимости
  )

  // Мемоизируем матрицу группировки заметок
  const matrix = useMemo(() => {
    const matrixMap = new Map<string, λNote[]>()

    notes.forEach(note => {
      const pos = getNotePosition(note);
      if (!pos) {
        return;
      }

      const key = `${pos.left}|${pos.top}`;

      if (!matrixMap.has(key)) {
        matrixMap.set(key, [])
      }

      matrixMap.get(key)!.push(note)
    })

    return matrixMap
  }, [notes, getNotePosition])

  const renderItems = useMemo(() => {
    return Array.from(matrix.entries()).map(([key, notes]) => {
      if (notes.length === 1) {
        const note = notes[0]
        const pos = getNotePosition(note);
        if (!pos) {
          return null
        }

        return {
          type: 'single' as const,
          key: note.id,
          note,
          x: pos.left,
          y: pos.top - scrollY
        }
      }

      const nums = key.split('|').map(x => parseInt(x));
      return {
        type: 'group' as const,
        key,
        notes,
        x: nums[0],
        y: nums[1] - scrollY
      }
    }).filter(Boolean)
  }, [matrix, getNotePosition, scrollY])

  return (
    <Fragment>
      {renderItems.map((item) => {
        if (!item) return null

        if (item.type === 'single') {
          return (
            <NotePoint.Point
              type='note'
              key={item.key}
              note={item.note}
              x={item.x}
              y={item.y}
            />
          )
        }

        return (
          <NotePoint.Group
            type='note'
            key={item.key}
            notes={item.notes}
            x={item.x}
            y={item.y}
          />
        )
      })}
    </Fragment>
  )
}
