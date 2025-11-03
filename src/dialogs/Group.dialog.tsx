import { DisplayEventDialog, EventIndicator } from './Event.dialog'
import { Application } from '@/context/Application.context'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useRef } from 'react'
import { Dialog } from '@/ui/Dialog'
import { Doc } from '@/entities/Doc'
import { Stack } from '@/ui/Stack'
import { format } from 'date-fns'

import s from './styles/DisplayGroupDialog.module.css'

interface DisplayGroupDialogProps {
  events: Doc.Type[]
}

export function DisplayGroupDialog({ events }: DisplayGroupDialogProps) {
  const { spawnDialog } = Application.use()

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 5,
  });

  const renderEvent = useCallback((event: Doc.Type) => {
    if (!event) return null;
  
    return (
      <Stack className={s.event} onClick={() => spawnDialog(<DisplayEventDialog event={event} />)} key={event._id}>
        <EventIndicator event={event} />
        <Stack dir="column" jc="space-evenly" ai="flex-start" flex className={s.info} gap={2}>
          <p className={s.id}>{event._id}</p>
          <span className={s.description}>
            {`${format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}.${String(event['gulp.timestamp'] % 1_000_000n).padStart(6, '0')}`} | {event['gulp.event_code']}
          </span>
        </Stack>
      </Stack>
    );
  }, [spawnDialog]);

  return (
    <Dialog>
      <div ref={parentRef} style={{ height: '100%', paddingRight: 12, overflow: 'auto'}} >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }} >
         {virtualizer.getVirtualItems().map(v => (
            <div
              key={v.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${v.size}px`,
                transform: `translateY(${v.start}px)`,
              }}
            >
              {renderEvent(events[v.index])}
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
