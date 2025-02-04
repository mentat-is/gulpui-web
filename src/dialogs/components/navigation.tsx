import { useApplication } from '@/context/Application.context';
import { λEvent } from '@/dto/ChunkEvent.dto';
import { Button, Stack } from '@impactium/components';
import s from './navigation.module.css';
import { useEffect, useState } from 'react';
import { Event, File } from '@/class/Info';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { DisplayEventDialog } from '../Event.dialog';
import { cn } from '@impactium/utils';

export namespace Navigation {
  export interface Props {
    event: λEvent
  }
}

export function Navigation({ event }: Navigation.Props) {
  const { Info, spawnDialog } = useApplication();
  const [events, setEvents] = useState<λEvent[]>([]);

  useEffect(() => {
    const file = File.id(Info.app, event.file_id);
    
    const events = Event.get(Info.app, file.id);

    const index = events.findIndex(ev => ev.id === event.id);

    const nears = events.filter((e, i) => i > index - 16 && i < index + 16);

    setEvents(nears.reverse());
  }, [event]);

  const navigatorEventClickHandlerConstructor = (e: λEvent) => {
    return () => spawnDialog(<DisplayEventDialog event={e} />);
  }

  const changeEventTargerHandlerConstructor = (forvard: boolean) => () => {
    const event = Info.setTimelineTarget(forvard ? 1 : -1);

    spawnDialog(<DisplayEventDialog event={event}  />);
  }

  return (
    <Stack className={s.navigation} jc='space-between'>
      <Button onClick={changeEventTargerHandlerConstructor(true)} img='ArrowLeft' variant='outline'>Previous</Button>
      <Stack className={s.content} jc='center'>
        {events.map(e => <SymmetricSvg className={cn(e.id === event.id && s.focus)} onClick={navigatorEventClickHandlerConstructor(e)} text={e.id} />)}
      </Stack>
      <Button onClick={changeEventTargerHandlerConstructor(false)} img='ArrowRight' variant='outline' revert>Next</Button>
    </Stack>
  )
}