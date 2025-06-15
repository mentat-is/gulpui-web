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
import React, { useMemo, useState } from 'react'

interface DisplayGroupDialogProps {
  events: λEvent[]
}

export function DisplayGroupDialog({ events }: DisplayGroupDialogProps) {
  const { spawnDialog } = useApplication()

  const PAGE_SIZE = 16;
  const [currentPage, setCurrentPage] = useState(0)

  const totalPages = Math.ceil(events.length / PAGE_SIZE)
  const startIndex = currentPage * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, events.length)
  const currentEvents = events.slice(startIndex, endIndex)

  const elements: React.ReactNode[] = useMemo(() => {
    return (
      currentEvents.map((event: λEvent, index: number) => (
        <>
          <Stack key={event._id} className={s.event} style={{ flexShrink: 0, height: 32 }}>
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
          {index < currentEvents.length - 1 && <Separator />}
        </>
      ))
    )
  }, [currentEvents, spawnDialog]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
  }

  return (
    <Dialog
      title={`Choose event${events[0]?.timestamp ? ` for ${new Date(events[0].timestamp).toLocaleTimeString()} ${new Date(events[0].timestamp).toLocaleDateString()}` : ''}`}
      description={`List includes ${events.length} events (Page ${currentPage + 1} of ${totalPages})`}
      className={s.dialog}
    >
      <Stack jc='space-between' ai='center' pos='relative'>
        <Button
          variant="secondary"
          onClick={handlePrevPage}
          disabled={currentPage === 0}
          img='ArrowLeft'
          rounded
        />
        <span className={s.pagination}>
          {startIndex + 1}-{endIndex} of {events.length}
        </span>
        <Button
          revert
          variant="secondary"
          onClick={handleNextPage}
          disabled={currentPage === totalPages - 1 || events.length === 0}
          img='ArrowRight'
          rounded
        />
      </Stack>
      <Separator />
      {elements}
    </Dialog>
  )
}