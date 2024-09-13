import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import s from './styles/DisplayGroupDialog.module.css';
import { SymmetricSvg } from "@/ui/SymmetricSvg";
import { DisplayEventDialog } from "./DisplayEventDialog";
import { useApplication } from "@/context/Application.context";
import { λEvent } from "@/dto/ChunkEvent.dto";

interface DisplayGroupDialogProps {
  events: λEvent[];
}

export function DisplayGroupDialog({ events }: DisplayGroupDialogProps) {
  const { spawnDialog } = useApplication();
  return (
    <Dialog title='Choose event' description='Choose event from list below'>
      {events.map((event: λEvent) => (
        <div className={s.event} key={event._id}>
          <div className={s.combination}>
            <SymmetricSvg text={event._id} className={s.icon} />
            <div className={s.group}>
              <p className={s.title}>{event.event.code}</p>
              <p className={s.description}>{event._id}</p>
            </div>
          </div>
          <Button variant='outline' onClick={() => spawnDialog(<DisplayEventDialog event={event} />)} img='https://cdn.impactium.fun/ui/drag/more-horizontal.svg' />
        </div>
      ))}
    </Dialog>
  )
}
