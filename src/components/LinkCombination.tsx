import { SymmetricSvg } from '@/ui/SymmetricSvg';
import s from './styles/Combination.module.css';
import { HTMLAttributes } from 'react';
import { cn } from '@/ui/utils';
import { useApplication } from '@/context/Application.context';
import { Link } from '@/class/Info';
import { λLink } from '@/dto/Dataset';

interface LinkCombinationProps extends HTMLAttributes<HTMLDivElement> {
  link: λLink;
};

export function LinkCombination({ link, children, className, ...props }: LinkCombinationProps) {
  const { app } = useApplication();

  const events = Link.events(app, link);

  return (
    <div className={cn(s.unit, className)} {...props}>
      <SymmetricSvg text={events.map(e => e.id).join('')} />
      <div className={s.text}>
        <p className={s.top}>{link.name || link.doc_id_from}</p>
        <p className={s.bottom}>{link.description}</p>
      </div>
      {children}
    </div>
  );
}
