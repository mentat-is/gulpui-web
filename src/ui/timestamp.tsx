import { format } from 'date-fns';
import { HTMLAttributes, useMemo } from 'react';
import s from './styles/timestamp.module.css';
import { cn } from '@impactium/utils';

namespace Timestamp {
  export interface Props extends Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> {
    value: number;
  }
}

export function Timestamp({ value, className, ...props }: Timestamp.Props) {
  const Timestamp = useMemo(() => <p className={cn(s.timestamp, className)} {...props}>{format(value, 'yyyy.MM.dd HH:mm:ss SSS')}ms</p>, [value, className, props.style]);

  return Timestamp;
};
