import { Dialog } from '@/ui/Dialog'
import s from './styles/DisplayGroupDialog.module.css'
import { DisplayEventDialog, EventIndicator } from './Event.dialog'
import { Application } from '@/context/Application.context'
import { Stack } from '@/ui/Stack'
import { format } from 'date-fns'
import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Doc } from '@/entities/Doc'

interface DisplayGroupDialogProps {
  events: Doc.Type[]
}

export function DisplayGroupDialog({ events }: DisplayGroupDialogProps) {
  const { spawnDialog } = Application.use()

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32 + 12,
    overscan: 5,
  });

  const renderEvent = (event: Doc.Type) => {
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
  };

  return (
    <Dialog>
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
