import { format } from 'date-fns';
import { HTMLAttributes, useMemo } from 'react';
import s from './styles/timestamp.module.css';
import { cn } from '@impactium/utils';
import { Logger } from '@/dto/Logger.class';

namespace Timestamp {
  export interface Props extends Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> {
    value: number;
  }
}

export function Timestamp({ value, className, ...props }: Timestamp.Props) {
  const getDate = () => {
    try {
      return format(new Date(value).getTime(), 'yyyy.MM.dd HH:mm:ss SSS');
    } catch (error) {
      Logger.error(`Invalid time value. Expected number | string | Date, got ${value}`, 'Timestamp');
      return '';
    }
  }
  
  const Timestamp = useMemo(() => <p className={cn(s.timestamp, className)} {...props}>{getDate()}ms</p>, [value, className, props.style]);

  return Timestamp;
};
