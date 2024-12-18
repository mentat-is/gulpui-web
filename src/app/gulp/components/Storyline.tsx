import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/utils";
import { Stack } from "@impactium/components";
import { format } from "date-fns";
import s from './storyline.module.css';
import { HTMLAttributes, useCallback } from "react";
import { Timestamp } from "@/ui/timestamp";

export function StorylineBanner() {
  const { app, Info } = useApplication();

  const notes = app.target.notes;

  const timespamps = notes.map(n => n.events.map(e => e.timestamp)).flat();

  const min = Math.min(...timespamps);
  const max = Math.max(...timespamps);

  const done = <Button img='Download' />

  return (
    <Banner title='Storyline' done={done}>
      <Stack>
        <Graph min={min} max={max} />
      </Stack>
    </Banner>
  )
}

namespace Graph {
  export interface Props extends Stack.Props {
    min: number;
    max: number;
  }
}


export function Graph({ min, max, className, ...props }: Graph.Props) {

  return (
    <Stack className={cn(s.graph, className)} {...props}>
      <Stack jc='space-between'>
        <Timestamp value={min} />
        <Timestamp value={max} />
      </Stack>
    </Stack>
  )
}