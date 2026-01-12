import { DisplayEventDialog, EventIndicator } from '../Event.dialog'
import { Application } from '@/context/Application.context'
import { useEffect, useState } from 'react'
import { Source } from '@/entities/Source'
import s from './navigation.module.css'
import { cn } from '@impactium/utils'
import { Button } from '@/ui/Button'
import { Doc } from '@/entities/Doc'
import { Stack } from '@/ui/Stack'

export namespace Navigation {
  export interface Props {
    event: Doc.Type
  }
}

const WINDOW_SIZE = 11

export function Navigation({ event }: Navigation.Props) {
  const { app, spawnDialog } = Application.use()
  const [events, setEvents] = useState<Doc.Type[]>([])

  useEffect(() => {
    const file = Source.Entity.id(app, event['gulp.source_id'])
    if (!file) return

    const allEvents = Doc.Entity.get(app, file.id)
    if (!allEvents.length) return

    const index = allEvents.findIndex((e) => e._id === event._id)
    if (index === -1) return

    const CENTER = Math.floor(WINDOW_SIZE / 2)
    setEvents(
      Array.from({ length: WINDOW_SIZE }, (_, i) =>
        allEvents[(index + i - CENTER + allEvents.length) % allEvents.length]
      )
    )
  }, [event._id, app.target.notes, app.target.links]) 
  
  const openEvent = (e: Doc.Type) => () => spawnDialog(<DisplayEventDialog event={e} />)

  const changeEvent = (forward: boolean) => () => {
    const file = Source.Entity.id(app, event['gulp.source_id'])
    const allEvents = Doc.Entity.get(app, file.id)
    const index = allEvents.findIndex((e) => e._id === event._id)

    if (index === -1) return
    
    const nextIndex = (index + (forward ? 1 : -1) + allEvents.length) % allEvents.length
    spawnDialog(<DisplayEventDialog event={allEvents[nextIndex]} />)
  }

  return (
    <Stack className={s.navigation} jc="space-between">
      <Button onClick={changeEvent(false)} icon="ArrowLeft" variant="default" rounded />
      <Stack className={s.content} jc="center" flex>
        {events.map((e) => (
          <EventIndicator
            key={e._id}
            className={cn(e._id === event._id && s.focus)}
            onClick={openEvent(e)}
            event={e}
          />
        ))}
      </Stack>
      <Button onClick={changeEvent(true)} icon="ArrowRight" variant="default" rounded />
    </Stack>
  )
}
