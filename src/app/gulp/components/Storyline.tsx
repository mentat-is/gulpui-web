import { useApplication } from '@/context/Application.context';
import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { cn } from '@/ui/utils';
import { Stack } from '@impactium/components';
import s from './storyline.module.css';
import { useCallback, useEffect, useRef } from 'react';
import { Timestamp } from '@/ui/timestamp';
import { Operation, Note as NoteEntity, Note } from '@/class/Info';
import { λNote } from '@/dto/Dataset';
import { NotePoint } from '@/ui/Note';
import { Icon } from '@impactium/icons';
import { Glyph } from '@/ui/Glyph';
import { Separator } from '@/ui/Separator';
import { format } from 'date-fns';


export function StorylineBanner() {
  const { app } = useApplication();

  const notes = app.target.notes;

  const timespamps = notes.map(n => Note.timestamp(app, n));

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
      <List />
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
  const { app } = useApplication();
  const graph = useRef<HTMLCanvasElement>(null);

  props.dir = props.dir ?? 'column';

  const getNoteXPositionFromTimestamp = useCallback((timestamp: number) => Math.round(((timestamp - min) / (max - min)) * (graph.current?.width || 0)), [min, max]);

  return (
    <Stack className={cn(s.graph, className)} {...props}>
      <div className={s.wrapper}>
        <canvas ref={graph} className={s.canvas} />
        {notes.map(note => {
        const timestamp = Note.timestamp(app, note);
        return <NotePoint note={note} x={getNoteXPositionFromTimestamp(timestamp)} y={'50%' as unknown as number} />
      })}
      </div>
      <Stack jc='space-between' className={s.minMax}>
        <Timestamp value={min} />
        <Timestamp value={max} />
      </Stack>
    </Stack>
  )
}

function List() {
  const { app } = useApplication();

  const notes = app.target.notes;

  

  return (
    <Stack className={s.list} gap={0} dir='column'>
      {notes.map(note => {
        return <DetailedNote note={note} />
      })}
    </Stack>
  )
}

namespace DetailedNote {
  export interface Props {
    note: λNote
  }
}

function DetailedNote({ note }: DetailedNote.Props) {
  const { app } = useApplication();

  const timestamp = Note.timestamp(app, note);

  return (
    <Stack className={s.detailed}>
      <Icon name={Note.icon(note)} />
      <p className={s.name}>{note.name}</p>
      <Separator className={s.separator} orientation='vertical' />
      <Icon name='Clock' size={12} />
      <p className={s.timestamp}>{format(timestamp, 'yyyy.MM.dd HH:mm:ss SSS')}</p>
    </Stack>
  )
}