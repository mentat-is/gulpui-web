import { useApplication } from "@/context/Application.context";
import s from './styles/Ruler.module.css';
import { format, differenceInMilliseconds, addMilliseconds } from 'date-fns';
import { useRef, useEffect, useState } from 'react';
import { getDateFormat } from "@/ui/utils";

interface RulerProps {
  scrollX: number;
}

export function Ruler({ scrollX }: RulerProps) {
  const { app, Info, timeline } = useApplication();
  const ruler = useRef<HTMLDivElement>(null);
  const [visibleDates, setVisibleDates] = useState<Date[]>([]);
  const { min, max } = app.target.bucket?.selected || {};

  const generateDates = () => {
    if (!timeline.current || !min || !max) return;

    const totalMilliseconds = differenceInMilliseconds(new Date(max), new Date(min));

    // Вычисляем шаг в зависимости от масштаба и ширины видимой области
    const step = Math.max(totalMilliseconds / (Info.width / 100), 1);
    const visibleWidth = timeline.current.clientWidth || 0;

    const dates: Date[] = [];
    
    // Определяем начало и конец видимого диапазона
    const visibleStartTime = addMilliseconds(new Date(min), (scrollX / Info.width) * totalMilliseconds);
    const visibleEndTime = addMilliseconds(new Date(min), ((scrollX + visibleWidth) / Info.width) * totalMilliseconds);

    let currentTime = visibleStartTime;

    while (currentTime <= visibleEndTime) {
      dates.push(currentTime);
      currentTime = addMilliseconds(currentTime, step);
    }

    setVisibleDates(dates);
  };

  useEffect(() => {
    if (!min || !max) return;
    generateDates();
  }, [min, max, scrollX, app.timeline.scale]);

  useEffect(() => {
    window.addEventListener('resize', generateDates);
    timeline.current?.addEventListener('resize', generateDates);

    return () => {
      window.removeEventListener('resize', generateDates);
      timeline.current?.removeEventListener('resize', generateDates);
    };
  }, [ruler]);

  const timeUnit = visibleDates.length > 1
    ? getDateFormat(differenceInMilliseconds(visibleDates[1], visibleDates[0])) || 'MMM yyyy'
    : 'MMM yyyy';

  return (
    <div className={s.ruler} ref={ruler}>
      <div className={s.wrapper}>
        {visibleDates.map((date, index) => {
          const isEven = index % 2 === 0;
          return (
            <div key={index} className={s.date} style={{ left: index * 100 }} data-even={isEven}>
              <p>{format(date, timeUnit)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
