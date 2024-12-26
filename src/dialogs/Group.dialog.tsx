import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import s from './styles/DisplayGroupDialog.module.css';
import { SymmetricSvg } from "@/ui/SymmetricSvg";
import { DisplayEventDialog } from "./Event.dialog";
import { useApplication } from "@/context/Application.context";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { useEffect, useState } from "react";
import { Stack } from "@impactium/components";

interface DisplayGroupDialogProps {
  events: λEvent[];
}

export function DisplayGroupDialog({ events }: DisplayGroupDialogProps) {
  const { spawnDialog } = useApplication();
  const [visible, setVisible] = useState<number>(16);

  useEffect(() => {
    return () => {
      setVisible(16);
    }
  }, [events]);

  return (
    <Dialog title={`Choose event${events[0]?.timestamp ? ` for ${new Date(events[0].timestamp).toLocaleTimeString()} ${new Date(events[0].timestamp).toLocaleDateString()}` : ''}`} description={`List includes ${events.length} events`}>
      {events.map((event: λEvent, i) => 
        <div className={s.event} key={event.id}>
          <div className={s.combination}>
            <SymmetricSvg text={event.id} className={s.icon} />
            <div className={s.group}>
              <p className={s.title}>{event.source_id}</p>
              <p className={s.description}>{event.event.code}</p>
            </div>
          </div>
          <Button variant='outline' onClick={() => spawnDialog(<DisplayEventDialog event={event} />)} img='ArrowRight' revert>Open</Button>
        </div>
      )}
      {events.length > visible && (
        <Stack gap={12} jc='center' ai='center'>
          <span style={{ fontSize: 14, color: 'var(--text-dimmed)' }}>Displayed {visible} / {events.length} events</span>
          <Button onClick={() => setVisible(v => v + 16)} img='Plus'>Display 16 more events</Button>
        </Stack>
      )}
    </Dialog>
  )
}
