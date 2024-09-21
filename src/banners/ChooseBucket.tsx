import s from './styles/ChooseBucket.module.css'
import { useState } from "react";
import { Banner } from "../ui/Banner";
import { useLanguage } from "../context/Language.context";
import { Button } from '../ui/Button';
import { useApplication } from '../context/Application.context';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { Calendar } from '../ui/Calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import React from 'react';
import { ui } from '@/ui/utils';

export function ChooseBucket() {
  const { lang } = useLanguage();
  const { Info, destroyBanner, app } = useApplication();
  const [date, setDate] = useState<DateRange>({
    from: new Date(app.target.bucket.timestamp.min),
    to: new Date(app.target.bucket.timestamp.max),
  });

  const map = [
    { text: lang.last.day, do: () => {
        Info.setBucketOneDay();
        destroyBanner()
      }
    },
    { text: lang.last.week, do: () => {
        Info.setBucketOneWeek();
        destroyBanner()
      }
    },
    { text: lang.last.month, do: () => {
        Info.setBucketOneMonth();
        destroyBanner()
      }
    },
      { text: lang.last.full, do: () => {
        Info.setBucketFullRange();
        destroyBanner()
      }
    },
  ]

  const save = () => {
    Info.setBucketCustomRange(date.from!.valueOf(), date.to!.valueOf());
    destroyBanner();
  }

  return (
    <Banner className={s.banner} title='Timeline' fixed={true}>
      <h5>{lang.choose_bucket}</h5>
      <div className={s.button_group}>
        {map.map((_: any, index) => (
          <Button onClick={_.do} key={index}>{_.text}</Button>
        ))}
      </div>
      <div className={s.input_group}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant='hardline' img='CalendarCheck2'>
            {date?.from ? (
              date.to ? (
                <React.Fragment>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </React.Fragment>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (lang.timeline.set_all)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className={s.calendar}>
            <Calendar 
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(v) => setDate(v!)}
              numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      </div>
      <Button variant={date?.from ? 'default' : 'disabled'} img='Save' onClick={save}>Save</Button>
    </Banner>
  ) 
}