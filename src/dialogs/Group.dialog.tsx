import { Button } from '@impactium/components'
import { Dialog } from '@/ui/Dialog'
import s from './styles/DisplayGroupDialog.module.css'
import { SymmetricSvg } from '@/ui/SymmetricSvg'
import { DisplayEventDialog } from './Event.dialog'
import { useApplication } from '@/context/Application.context'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Stack } from '@impactium/components'
import { format } from 'date-fns'
import { Internal } from '@/class/Info'
import { Separator } from '@/ui/Separator'
import React, { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface DisplayGroupDialogProps {
  events: λEvent[]
}

export function DisplayGroupDialog({ events }: DisplayGroupDialogProps) {
  const { spawnDialog } = useApplication()

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32 + 8,
    overscan: 5,
  })

  const renderEvent = (event: λEvent) => (
    <Stack className={s.event} key={event._id} style={{ flexShrink: 0, height: 32 }}>
      <SymmetricSvg text={event._id} />
      <Stack
        dir="column"
        jc="space-evenly"
        ai="flex-start"
        flex
        className={s.info}
        gap={2}
      >
        <p className={s.id}>{event._id}</p>
        <span className={s.description}>
          {`${format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}.${String(event['gulp.timestamp'] % 1_000_000n).padStart(6, '0')}`} | {event['gulp.event_code']}
        </span>
      </Stack>
      <Button
        variant="secondary"
        onClick={() => spawnDialog(<DisplayEventDialog event={event} />)}
        revert
        size='sm'
      >
        View
      </Button>
    </Stack>
  )

  return (
    <Dialog
      title={`Choose event${events[0]?.timestamp ? ` for ${new Date(events[0].timestamp).toLocaleTimeString()} ${new Date(events[0].timestamp).toLocaleDateString()}` : ''}`}
      description={`List includes ${events.length} events`}
    >
      <div
        ref={parentRef}
        className={s.virtualizedContainer}
        style={{
          height: '100%',
          paddingRight: 12,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderEvent(events[virtualItem.index])}
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  )
}