import { useApplication } from '@/context/Application.context';
import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { cn } from '@/ui/utils';
import { Stack } from '@impactium/components';
import s from './storyline.module.css';
import { useCallback, useEffect, useRef } from 'react';
import { Timestamp } from '@/ui/timestamp';
import { Operation, Note as NoteEntity } from '@/class/Info';
import { Note } from '@/ui/Note';
import { λNote } from '@/dto/Note.dto';

export function StorylineBanner() {
  const { app, Info } = useApplication();

  const notes = app.target.notes;

  const timespamps = notes.map(n => n.events.map(e => e.timestamp)).flat();

  const min = Math.min(...timespamps);
  const max = Math.max(...timespamps);

  const exportStorylineAsJSON = () => {
    const data = JSON.stringify(notes, null, 2);
  
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyline_${Operation.selected(app)}.json`;
  
    link.click();
  
    URL.revokeObjectURL(url);
    link.remove();
  };
  

  const done = <Button onClick={exportStorylineAsJSON} variant='glass' img='Download' />

  return (
    <Banner title='Storyline' done={done}>
      <Graph min={min} max={max} notes={notes} />
    </Banner>
  )
}

namespace Graph {
  export interface Props extends Stack.Props {
    min: number;
    max: number;
    notes: λNote[];
  }
}


export function Graph({ min, max, notes, className, ...props }: Graph.Props) {
  const graph = useRef<HTMLCanvasElement>(null);

  props.dir = props.dir ?? 'column';

  const getNoteXPositionFromTimestamp = useCallback((timestamp: number) => Math.round(((timestamp - min) / (max - min)) * (graph.current?.width || 0)), [min, max]);

  useEffect(() => {

  }, []);

  return (
    <Stack className={cn(s.graph, className)} {...props}>
      <div className={s.wrapper}>
        <canvas ref={graph} className={s.canvas} />
        {notes.map(note => {
        const timestamp = NoteEntity.timestamp(note);
        return <Note note={note} left={getNoteXPositionFromTimestamp(timestamp)} top='50%' />
      })}
      </div>
      <Stack jc='space-between' className={s.minMax}>
        <Timestamp value={min} />
        <Timestamp value={max} />
      </Stack>
    </Stack>
  )
}