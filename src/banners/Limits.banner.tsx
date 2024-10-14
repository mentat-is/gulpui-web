import s from './styles/LimitsBanner.module.css'
import { useState } from "react";
import { Banner } from "../ui/Banner";
import { useLanguage } from "../context/Language.context";
import { Button } from '../ui/Button';
import { useApplication } from '../context/Application.context';
import { eachDayOfInterval, eachMonthOfInterval, eachYearOfInterval, format } from 'date-fns';
import { Switch } from '@/ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/Select';
import { Separator } from '@/ui/Separator';

export function LimitsBanner() {
  const { lang } = useLanguage();
  const { Info, destroyBanner, app } = useApplication();

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

  return (
    <Banner className={s.banner} title='Timeline'>
      <div className={s.date_input_choose_option}>
        <span>Select from limits</span>
        <Switch />
        <span>ISOString</span>
      </div>
      <Separator />
      <div className={s.wrapper}>
        <span>Start:</span>
        <DateSelection initialDate={app.target.bucket.selected.min} onDateChange={Info.setBucketSelectedStart} />
      </div>
      <div className={s.wrapper}>  
        <span>End:</span>
        <DateSelection initialDate={app.target.bucket.selected.max} onDateChange={Info.setBucketSelectedEnd} />
      </div>
      <Separator />
      <div className={s.button_group}>
        {map.map((_: any, index) => (
          <Button variant='outline' onClick={_.do} key={index}>{_.text}</Button>
        ))}
        <Button variant={'default'} img='Bookmark' onClick={destroyBanner}>Save</Button>
      </div>
    </Banner>
  ) 
}

export function DateSelection({ initialDate, onDateChange }: { initialDate: number, onDateChange: (date: number) => void }) {
  const { app } = useApplication();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(initialDate));

  const handleYearChange = (year: number) => {
    const newDate = new Date(selectedDate.setFullYear(year));
    setSelectedDate(newDate);
    onDateChange(newDate.valueOf());
  };

  const handleMonthChange = (month: number) => {
    const newDate = new Date(selectedDate.setMonth(month - 1));
    setSelectedDate(newDate);
    onDateChange(newDate.valueOf());
  };

  const handleDayChange = (day: number) => {
    const newDate = new Date(selectedDate.setDate(day));
    setSelectedDate(newDate);
    onDateChange(newDate.valueOf());
  };

  const years = eachYearOfInterval({
    start: new Date(app.target.bucket.timestamp.min),
    end: new Date(app.target.bucket.timestamp.max),
  });

  const months = eachMonthOfInterval({
    start: new Date(`${selectedDate.getFullYear()}-01-01`),
    end: new Date(`${selectedDate.getFullYear()}-12-31`),
  });

  const days = eachDayOfInterval({
    start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    end: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0),
  });

  return (
    <div className={s.input_group}>
      {/* Year select */}
      <Select onValueChange={(value) => handleYearChange(parseInt(value))}>
        <SelectTrigger>{selectedDate.getFullYear() || 'Select year'}</SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year.valueOf()} value={year.getFullYear().toString()}>
              {year.getFullYear()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month select */}
      <Select onValueChange={(value) => handleMonthChange(parseInt(value))}>
        <SelectTrigger>{format(selectedDate, "MMMM") || "Select Month"}</SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.valueOf()} value={month.getMonth().toString()}>
              {format(month, "MMMM")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Day select */}
      <Select onValueChange={(value) => handleDayChange(Number(value))}>
        <SelectTrigger>{selectedDate.getDate() || "Select Day"}</SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem key={day.valueOf()} value={day.getDate().toString()}>
              {day.getDate()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
