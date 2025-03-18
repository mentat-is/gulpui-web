import { Button } from '@impactium/components'
import { Dialog } from '@/ui/Dialog'
import s from './styles/DisplayGroupDialog.module.css'
import { SymmetricSvg } from '@/ui/SymmetricSvg'
import { DisplayEventDialog } from './Event.dialog'
import { useApplication } from '@/context/Application.context'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Stack } from '@impactium/components'

interface DisplayGroupDialogProps {
  events: λEvent[]
}

export function DisplayGroupDialog({ events }: DisplayGroupDialogProps) {
  const { spawnDialog } = useApplication()

  return (
    <Dialog
      title={`Choose event${events[0]?.timestamp ? ` for ${new Date(events[0].timestamp).toLocaleTimeString()} ${new Date(events[0].timestamp).toLocaleDateString()}` : ''}`}
      description={`List includes ${events.length} events`}
    >
      {events.map((event: λEvent) => (
        <Stack key={event.id} className={s.event} style={{ flexShrink: 0, height: 32 }}>
          <SymmetricSvg text={event.id} />
          <Stack
            dir="column"
            jc="space-evenly"
            ai="flex-start"
            className={s.info}
          >
            <p className={s.id}>{event.id}</p>
            <Stack className={s.description}>
              <p>
                Code <span>{event.code}</span> at{' '}
                <span>{event.nanotimestamp.toString()}</span>
              </p>
            </Stack>
          </Stack>
          <Button
            variant="outline"
            onClick={() => spawnDialog(<DisplayEventDialog event={event} />)}
            img="ArrowRight"
            revert
          >
            Open
          </Button>
        </Stack>
      ))}
    </Dialog>
  )
}
