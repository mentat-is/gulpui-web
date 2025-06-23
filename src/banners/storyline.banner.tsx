import { useApplication } from '@/context/Application.context'
import { Banner } from '@/ui/Banner'
import { Button, Stack } from '@impactium/components'
import s from './styles/storyline.module.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Operation, Note, Context, File } from '@/class/Info'
import { Default, λFile, λNote } from '@/dto/Dataset'
import { XY } from '@/dto/XY.dto'
import { cn } from '@impactium/utils'
import { download } from '@/ui/utils'
// @ts-ignore
import C2V from 'canvas2svg'

export function StorylineBanner() {
  const { app } = useApplication()

  const notes = app.target.notes

  const exportStorylineAsJSON = () => {
    const data = JSON.stringify(notes, null, 2)

    download(data, 'application/json', `storyline_${Operation.selected(app)}.json`);
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

  const done = <Button onClick={exportStorylineAsJSON} variant="glass" img="Download" />;

  const option = <Button onClick={exportStorylineAsSvg} variant="ghost" img="AcronymSvg" />;

  return (
    <Banner title="Storyline" done={done} option={option} className={s.banner}>
      <Graph notes={notes} />
    </Banner>
  )
}

namespace Graph {
  export interface Props extends Stack.Props {
    notes: λNote[]
  }

  export type Matrix = Map<λNote['id'], XY>
}

export function Graph({ notes, className, ...props }: Graph.Props) {
  const { app } = useApplication()

  props.dir = props.dir ?? 'column'

  const getNoteXPositionFromTimestamp = useCallback((timestamp: number) => {
    const graph = document.getElementById('graph')
    if (!graph) {
      return 0;
    }

    return Math.round(((timestamp - app.timeline.frame.min) / (app.timeline.frame.max - app.timeline.frame.min)) * (graph.clientWidth - 64));
  }, []);

  const matrix: Map<λNote['id'], number> = new Map();

  // console.log(notes);

  matrix.clear()

  notes.forEach((note) => {
    const timestamp = Note.timestamp(note)
    matrix.set(note.id, getNoteXPositionFromTimestamp(timestamp) + 64)
  })

  Array.from(matrix.entries()).map(([id, x]) => {
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

    const existingValues = matrix.values().filter(v => v === x);

    x += existingValues.toArray().length;

    matrix.set(id, x);
  })

  return (
    <Stack id='graph' className={cn(s.graph, className)} pos='relative' jc='flex-end' ai='unset' {...props}>
      {Array.from(matrix.entries()).sort((a, b) => a[1] - b[1]).map(([id, x], i) => {
        const note = Note.id(app, id)

        return (
          <>
            <Button key={id} size='sm' id={id} style={{ left: x, zIndex: ++i, color: note.color }} className={s.note} img={Note.icon(note)} variant='secondary'>
              {note.name}
            </Button>
            <hr className={cn(s.line, s.top)} style={{ color: note.color, left: x }} />
          </>
        )
      })}
    </Stack>
  )
}

