import { SymmetricSvg } from "@/ui/SymmetricSvg";
import s from './styles/Combination.module.css';
import { HTMLAttributes } from "react";
import { cn } from "@/ui/utils";
import { λEvent } from "@/dto/ChunkEvent.dto";

interface EventCombinationProps extends HTMLAttributes<HTMLDivElement> {
  event: λEvent;
};

export function EventCombination({ event, children, className, ...props }: EventCombinationProps) {
  return (
    <div className={cn(s.unit, className)} {...props}>
      <SymmetricSvg text={event._id} />
      <div className={s.text}>
        <p className={s.top}>{event._id}</p>
        <p className={s.bottom}>{event.file}</p>
      </div>
      {children}
    </div>
  );
}
