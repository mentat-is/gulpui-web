import { λLink } from "@/dto/Link.dto";
import { SymmetricSvg } from "@/ui/SymmetricSvg";
import s from './styles/Combination.module.css';
import { HTMLAttributes } from "react";
import { cn } from "@/ui/utils";

interface LinkCombinationProps extends HTMLAttributes<HTMLDivElement> {
  link: λLink;
};

export function LinkCombination({ link, children, className, ...props }: LinkCombinationProps) {
  return (
    <div className={cn(s.unit, className)} {...props}>
      <SymmetricSvg text={link.events.map(e => e._id).join('')} />
      <div className={s.text}>
        <p className={s.top}>{link.name || link.file}</p>
        <p className={s.bottom}>{link.description || link.context}</p>
      </div>
      {children}
    </div>
  );
}
