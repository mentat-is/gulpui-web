import { useApplication } from '@/context/Application.context'
import { Banner } from '@/ui/Banner'
import { Button, Stack } from '@impactium/components'
import s from './storyline.module.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Operation, Note, Context, File } from '@/class/Info'
import { Default, λFile, λNote } from '@/dto/Dataset'
import { NotePoint } from '@/ui/Note'
import { Icon } from '@impactium/icons'
import { Separator } from '@/ui/Separator'
import { format } from 'date-fns'
import { XY } from '@/dto/XY.dto'
import { cn } from '@impactium/utils'
import { download } from '@/ui/utils'
// @ts-ignore
import C2V from 'canvas2svg'

export function StorylineBanner() {
  const { Info, app } = useApplication()

  const notes = app.target.notes

  const timespamps = notes.map((n) => Note.timestamp(app, n))

  const min = Math.min(...timespamps)
  const max = Math.max(...timespamps)

  const exportStorylineAsJSON = () => {
    const data = JSON.stringify(notes, null, 2)

    download(
      data,
      'application/json',
      `storyline_${Operation.selected(app)}.json`,
    )
  }

  const exportStorylineAsSvg = () => {
    const graph = document.getElementById('graph')
    if (!graph) {
      return
    }

    const ctx = new C2V(graph.clientWidth, graph.clientHeight)

    // @ts-ignore
    graph.render(ctx)

    download(ctx.getSerializedSvg(true), 'image/svg+xml', 'gulp_storyline.svg')
  }

  const done = (
    <Button onClick={exportStorylineAsJSON} variant="glass" img="Download" />
  )

  const option = (
    <Button onClick={exportStorylineAsSvg} variant="ghost" img="AcronymSvg" />
  )

  return (
    <Banner title="Storyline" done={done} option={option}>
      <Graph min={min} max={max} notes={notes} />
      <List />
    </Banner>
  )
}

namespace Graph {
  export interface Props extends Stack.Props {
    min: number
    max: number
    notes: λNote[]
  }

  export type Matrix = Map<λNote['id'], XY>
}

export function Graph({ min, max, notes, className, ...props }: Graph.Props) {
  const { Info, app, spawnBanner } = useApplication()
  const graph = useRef<HTMLCanvasElement>(null)

  props.dir = props.dir ?? 'column'

  const getNoteXPositionFromTimestamp = useCallback(
    (timestamp: number) =>
      Math.round(
        ((timestamp - app.timeline.frame.min) /
          (app.timeline.frame.max - app.timeline.frame.min)) *
          512,
      ),
    [min, max],
  )

  const drawCanvas = (ctx = graph.current?.getContext('2d')) => {
    if (!ctx) {
      return
    }

    // @ts-ignore
    ctx.canvas.render = drawCanvas

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    const drown: number[] = []

    const draw = (note: λNote, x: number) => {
      if (drown.find((dx) => dx === x)) {
        draw(note, x + 1)
        return
      } else {
        drown.push(x)
      }

      ctx.fillStyle = note.color
      ctx.fillRect(x, 0, 1, ctx.canvas.height)
    }

    notes.forEach((note) => {
      const events = Note.events(app, note)

      events.forEach((event) => {
        draw(note, getNoteXPositionFromTimestamp(event.timestamp))
      })
    })
  }

  const [matrix, setMatrix] = useState<Graph.Matrix>(new Map())

  useEffect(() => {
    drawCanvas()

    // Очищаем
    matrix.clear()

    // Дефиницируем
    notes.forEach((note) => {
      // Ставим таймстамп
      const timestamp = Note.timestamp(app, note)
      // Инициализируем
      matrix.set(note.id, {
        x: getNoteXPositionFromTimestamp(timestamp),
        y: 0,
      })
    })

    Array.from(matrix.entries()).map(([id, { x, y }]) => {
      // const is = Ar  matrix.values().find(p => p.x >= x - 16 && p.x <= x + 16);

      const note = Note.id(app, id)

      if (!note) {
        return 0
      }

      const el = document.getElementById(note.id)

      if (!el) {
        return 0
      }

      const span = el.querySelector('span')

      if (!span) {
        return 0
      }

      matrix.set(id, {
        x,
        y: span.clientHeight + 32 + 16 + 4,
      })
    })

    setMatrix(matrix)
  }, [matrix, setMatrix, notes, graph])

  return (
    <Stack className={cn(s.graph, className)} {...props}>
      <div className={s.wrapper}>
        <canvas
          id="graph"
          width={512}
          height={256}
          ref={graph}
          className={s.canvas}
        />
        <Stack className={s.points}>
          {Array.from(matrix.entries()).map(([id, { x, y }]) => {
            const note = Note.id(app, id)

            return (
              <NotePoint.Point
                id={id}
                description={note.description}
                className={s.point}
                note={note}
                x={x}
                y={y}
                deleteObject={() => Info.note_delete(note)}
                editObject={() => {}}
              />
            )
          })}
        </Stack>
      </div>
      <Stack jc="space-between" className={s.minMax}></Stack>
    </Stack>
  )
}

function List() {
  const { app } = useApplication()
  const [active, setActive] = useState<λNote['id'] | null>(null)

  const notes = app.target.notes

  const activate = useCallback(
    (noteId: λNote['id']) => () => {
      setActive(noteId === active ? null : noteId)
    },
    [active, setActive],
  )

  return (
    <Stack className={s.list} gap={0} dir="column">
      {notes.map((note) => {
        return (
          <DetailedNote
            note={note}
            active={active === note.id}
            activate={activate(note.id)}
          />
        )
      })}
    </Stack>
  )
}

namespace DetailedNote {
  export interface Props {
    note: λNote
    active: boolean
    activate: () => void
  }

  export interface Detail {
    name: string
    value: Pick<λNote, 'glyph_id' | 'name'>
    icon: (obj: any) => Icon.Name
  }
}

function DetailedNote({ note, active, activate }: DetailedNote.Props) {
  const { app } = useApplication()

  const timestamp = Note.timestamp(app, note)

  const Detail = ({ name, value, icon }: DetailedNote.Detail) => {
    return (
      <Stack className={s.detail}>
        <p>{name}:</p>
        <Stack gap={4}>
          <Icon name={icon(value)} />
          <span>{value.name}</span>
        </Stack>
      </Stack>
    )
  }

  const button = active ? (
    <Button
      onClick={activate}
      style={{
        justifySelf: 'flex-end',
        borderRadius: 2,
        height: '24px !important',
      }}
      revert
      img="ListMinus"
      size="sm"
      variant="ghost"
    >
      Show less
    </Button>
  ) : (
    <Button
      onClick={activate}
      style={{
        justifySelf: 'flex-end',
        borderRadius: 2,
        height: '24px !important',
      }}
      revert
      img="ListPlus"
      size="sm"
      variant="ghost"
    >
      Show more
    </Button>
  )

  return (
    <Stack className={cn(s.detailed, active && s.active)} dir="column" gap={0}>
      <Stack className={s.general}>
        <Icon name={Note.icon(note)} />
        <p className={s.name}>{note.name}</p>
        <Separator className={s.separator} orientation="vertical" />
        <Icon color="var(--text-dimmed)" name="Clock" size={12} />
        <p className={s.timestamp}>
          {format(timestamp, 'yyyy.MM.dd HH:mm:ss SSS')}ms
        </p>
        {button}
      </Stack>
      <Stack
        ai="flex-start"
        dir="column"
        className={cn(s.details, active && s.active)}
      >
        <Detail
          name="Context"
          value={Context.id(app, note.context_id)}
          icon={Context.icon}
        />
        <Detail
          name="File"
          value={File.id(app, note.source_id)}
          icon={File.icon}
        />
        <Separator />
        {Note.events(app, note).map((event, i) => {
          return (
            <Detail
              key={event.id}
              name={`Event ${++i}`}
              value={{ ...(event as unknown as λFile), name: event.id }}
              icon={() => Default.Icon.EVENT}
            />
          )
        })}
        <Separator />
        {note.description}
      </Stack>
    </Stack>
  )
}
