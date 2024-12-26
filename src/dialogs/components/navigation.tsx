import { useApplication } from "@/context/Application.context";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { Button, Stack } from "@impactium/components";
import s from './navigation.module.css';
import { useEffect, useState } from "react";
import { Event, Source } from "@/class/Info";
import { SymmetricSvg } from "@/ui/SymmetricSvg";
import { DisplayEventDialog } from "../Event.dialog";
import { cn } from "@/ui/utils";

export namespace Navigation {
  export interface Props {
    event: λEvent
  }
}

export function Navigation({ event }: Navigation.Props) {
  const { Info, spawnDialog } = useApplication();
  const [events, setEvents] = useState<λEvent[]>([]);

  useEffect(() => {
    const source = Source.id(Info.app, event.source_id);
    
    const events = Event.get(Info.app, source.id);

    const index = events.findIndex(ev => ev.id === event.id);

    const nears = events.filter((e, i) => i > index - 16 && i < index + 16);

    setEvents(nears);
  }, [event]);

  const navigatorEventClickHandlerConstructor = (e: λEvent) => {
    return () => spawnDialog(<DisplayEventDialog event={e} />);
  }

  return (
    <Stack className={s.navigation} jc='space-between'>
      <Button onClick={() => Info.setTimelineTarget(1)} img='ArrowLeft' variant='outline'>Previous</Button>
      <Stack className={s.content} jc='center'>
        {events.map(e => <SymmetricSvg className={cn(e.id === event.id && s.focus)} onClick={navigatorEventClickHandlerConstructor(e)} text={e.id} />)}
      </Stack>
      <Button onClick={() => Info.setTimelineTarget(-1)} img='ArrowRight' variant='outline' revert>Next</Button>
    </Stack>
  )
}