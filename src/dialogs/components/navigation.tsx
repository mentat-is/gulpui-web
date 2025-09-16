import { useApplication } from '@/context/Application.context'
import s from './navigation.module.css'
import { useEffect, useState } from 'react'
import { cn } from '@impactium/utils'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Doc } from '@/entities/Doc'
import { Source } from '@/entities/Source'
import { DisplayEventDialog, EventIndicator } from '../Event.dialog'

export namespace Navigation {
  export interface Props {
    event: Doc.Type
  }
}

export function Navigation({ event }: Navigation.Props) {
  const { app, Info, spawnDialog } = useApplication()
  const [events, setEvents] = useState<Doc.Type[]>([])

  useEffect(() => {
    const file = Source.Entity.id(app, event['gulp.source_id'])

    const events = Doc.Entity.get(app, file.id)

    const index = events.findIndex((ev) => ev._id === event._id)

    const nears = events.filter((e, i) => i > index - 16 && i < index + 16)

    setEvents(nears.reverse())
  }, [event])

  const navigatorEventClickHandlerConstructor = (e: Doc.Type) => {
    return () => spawnDialog(<DisplayEventDialog event={e} />)
  }

  const changeEventTargerHandlerConstructor = (forvard: boolean) => () => {
    const event = Info.setTimelineTarget(forvard ? 1 : -1)

    if (event) {
      spawnDialog(<DisplayEventDialog event={event} />)
    }
  }

  const all = Doc.Entity.get(app, event['gulp.source_id']);

  return (
    <Stack className={s.navigation} jc="space-between">
      <Button
        disabled={all.length > 0 && all[all.length - 1]._id === event._id}
        onClick={changeEventTargerHandlerConstructor(true)}
        img="ArrowLeft"
        variant='secondary'
      />
      <Stack className={s.content} jc="center" flex>
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
        disabled={all.length > 0 && all[0]._id === event._id}
        onClick={changeEventTargerHandlerConstructor(false)}
        img="ArrowRight"
        variant='secondary'
        revert
      />
    </Stack>
  )
}
