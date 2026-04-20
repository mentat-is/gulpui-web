import { DisplayEventDialog, EventIndicator } from '../Event.dialog'
import { Application } from '@/context/Application.context'
import { useEffect, useState, useMemo } from 'react'
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

  const file = Source.Entity.id(app, event['gulp.source_id'])

  /** Local deduplication to ensure a clean list even if DataStore has stale duplicates */
  const allEvents = useMemo(() => {
    const raw = file ? Doc.Entity.get(app, file.id).toReversed() : []
    const unique: Doc.Type[] = []
    const seen = new Set<Doc.Id>()
    for (const e of raw) {
      if (e && !seen.has(e._id)) {
        seen.add(e._id)
        unique.push(e)
      }
    }
    return unique
  }, [file, app.timeline.renderVersion])

  const currentIndex = allEvents.findIndex((e) => e && e._id === event._id)

  /** Strictly centered window: always WINDOW_SIZE elements with current at center */
  const windowEvents = useMemo(() => {
    const half = Math.floor(WINDOW_SIZE / 2)
    return Array.from({ length: WINDOW_SIZE }, (_, i) => {
      if (currentIndex === -1) return null
      const targetIndex = currentIndex + (i - half)
      return (targetIndex >= 0 && targetIndex < allEvents.length) ? allEvents[targetIndex] : null
    })
  }, [allEvents, currentIndex])

  const openEvent = (e: Doc.Type) => () => spawnDialog(<DisplayEventDialog event={e} />)

  const changeEvent = (forward: boolean) => () => {
    if (currentIndex === -1) return
    const nextIndex = currentIndex + (forward ? 1 : -1)
    if (nextIndex >= 0 && nextIndex < allEvents.length) {
      spawnDialog(<DisplayEventDialog event={allEvents[nextIndex]} />)
    }
  }

  return (
    <Stack className={s.navigation} jc="space-between">
      <Button
        onClick={changeEvent(false)}
        icon="ArrowLeft"
        variant="default"
        rounded
        disabled={currentIndex <= 0}
      />

      <Stack className={s.content} jc="center" gap={4} flex>
        {windowEvents.map((e, i) =>
          e ? (
            <EventIndicator
              key={e._id}
              className={cn(e._id === event._id && s.focus)}
              onClick={openEvent(e)}
              event={e}
            />
          ) : (
            <div key={`placeholder-${i}`} className={s.placeholder} />
          )
        )}
      </Stack>

      <Button
        onClick={changeEvent(true)}
        icon="ArrowRight"
        variant="default"
        rounded
        disabled={currentIndex === -1 || currentIndex >= allEvents.length - 1}
      />
    </Stack>
  )
}
