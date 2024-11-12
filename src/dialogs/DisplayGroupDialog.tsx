import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import s from './styles/DisplayGroupDialog.module.css';
import { SymmetricSvg } from "@/ui/SymmetricSvg";
import { DisplayEventDialog } from "./DisplayEventDialog";
import { useApplication } from "@/context/Application.context";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { useEffect } from "react";
import { λ } from "@/class/Info";

interface DisplayGroupDialogProps {
  events: λEvent[];
  timestamp?: λ.Timestamp;
}

export function DisplayGroupDialog({ events, timestamp }: DisplayGroupDialogProps) {
  const { Info, spawnDialog } = useApplication();

  useEffect(() => {
    Info.setTimelineTarget(events[0]);
  }, [events]);

  return (
    <Dialog title={`Choose event${events[0]?.timestamp ? ` for ${new Date(events[0].timestamp).toLocaleTimeString()} ${new Date(events[0].timestamp).toLocaleDateString()}` : ''}`} description={`List includes ${events.length} events`}>
      {events.map((event: λEvent) => (
        <div className={s.event} key={event._id}>
          <div className={s.combination}>
            <SymmetricSvg text={event._id} className={s.icon} />
            <div className={s.group}>
              <p className={s.title}>{event.file}</p>
              <p className={s.description}>{event.event.code}</p>
            </div>
          </div>
          <Button variant='outline' onClick={() => spawnDialog(<DisplayEventDialog event={event} />)} img='ArrowRight' revert>Open</Button>
        </div>
      ))}
    </Dialog>
  )
}
