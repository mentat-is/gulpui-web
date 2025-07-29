import { useApplication } from '@/context/Application.context'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Button, Stack } from '@impactium/components'
import s from './navigation.module.css'
import { useEffect, useState } from 'react'
import { Event, File } from '@/class/Info'
import { DisplayEventDialog, EventIndicator } from '../Event.dialog'
import { cn } from '@impactium/utils'

export namespace Navigation {
  export interface Props {
    event: λEvent
  }
}

export function Navigation({ event }: Navigation.Props) {
  const { Info, spawnDialog } = useApplication()
  const [events, setEvents] = useState<λEvent[]>([])

  useEffect(() => {
    const file = File.id(Info.app, event['gulp.source_id'])

    const events = Event.get(Info.app, file.id)

    const index = events.findIndex((ev) => ev._id === event._id)

    const nears = events.filter((e, i) => i > index - 16 && i < index + 16)

    setEvents(nears.reverse())
  }, [event])

  const navigatorEventClickHandlerConstructor = (e: λEvent) => {
    return () => spawnDialog(<DisplayEventDialog event={e} />)
  }

  const changeEventTargerHandlerConstructor = (forvard: boolean) => () => {
    const event = Info.setTimelineTarget(forvard ? 1 : -1)

    spawnDialog(<DisplayEventDialog event={event} />)
  }

  return (
    <Stack className={s.navigation} jc="space-between">
      <Button
        onClick={changeEventTargerHandlerConstructor(true)}
        img="ArrowLeft"
        variant="outline"
      />
      <Stack className={s.content} jc="center">
        {events.map((e) => (
          <EventIndicator
            key={e._id}
            className={cn(e._id === event._id && s.focus)}
            onClick={navigatorEventClickHandlerConstructor(e)}
            event={e}
          />
        ))}
      </Stack>
      <Button
        onClick={changeEventTargerHandlerConstructor(false)}
        img="ArrowRight"
        variant="outline"
        revert
      />
    </Stack>
  )
}
