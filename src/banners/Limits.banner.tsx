import s from './styles/LimitsBanner.module.css'
import { useState } from 'react';
import { Banner } from '../ui/Banner';
import { Button } from '@impactium/components';
import { useApplication } from '../context/Application.context';
import { eachDayOfInterval, eachMonthOfInterval, eachYearOfInterval, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/Select';
import { Separator } from '@/ui/Separator';
import { Input } from '@/ui/Input';
import { toast } from 'sonner';
import { Card } from '@/ui/Card';
import { Toggle } from '@/ui/Toggle';
import { Context } from '@/class/Info';

export function LimitsBanner() {
  const { Info, destroyBanner, app } = useApplication();

  const minMax = Context.frame(app);

  const [manual, setManual] = useState<boolean>(false);
  const [min, setMin] = useState<number>(minMax.min);
  const [max, setMax] = useState<number>(minMax.max);
  const [loading, setLoading] = useState<boolean>(false);

  const map = [
    { text: 'Day', do: () => save(app.timeline.frame.max - 24 * 60 * 60 * 1000) },
    { text: 'Week', do: () => save(app.timeline.frame.max - 7 * 24 * 60 * 60 * 1000) },
    { text: 'Month', do: () => save(app.timeline.frame.max - 30 * 24 * 60 * 60 * 1000) },
    { text: 'Full range', do: () => save(app.timeline.frame.min) },
  ]

  const save = async (_min?: number) => {
    const range = { min: _min ?? min, max };

    setMin(range.min);
    setMax(range.max);

    if (range) {
      setLoading(true);

      Info.setTimelineFrame(range);

      await Info.refetch({ range });

      destroyBanner();
    }
  }

  const done = <Button variant='ghost' img='Check' loading={loading} onClick={() => save()} size='icon' />;

  return (
    <Banner className={s.banner} title='Visibility range' done={done}>
      <Toggle checked={manual} onCheckedChange={setManual} option={['Select from limits', 'ISO String']} />
      <Card>
        <div className={s.wrapper}>
          <span>Start:</span>
          <DateSelection initialDate={min} onDateChange={setMin} manual={manual} />
        </div>
        <Separator />
        <div className={s.wrapper}>  
          <span>End:</span>
          <DateSelection initialDate={max} onDateChange={setMax} manual={manual} />
        </div>
      </Card>
      <div className={s.button_group}>
        {map.map((_: any, index) => (
          <Button variant='outline' onClick={_.do} key={index}>{_.text}</Button>
        ))}
      </div>
    </Banner>
  ) 
}

export function DateSelection({ initialDate, onDateChange, manual }: { initialDate: number, onDateChange: (date: number) => void, manual: boolean }) {
  const { app } = useApplication();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(initialDate));
  const [inputValue, setInputValue] = useState<string>(format(selectedDate, 'yyyy-MM-dd'));
  if (manual) {
    return <Input
      type='text'
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
    onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      placeholder='String in ISO format'
      onBlur={() => {
        const date = new Date(inputValue);
        if (isNaN(date.getTime())) {
          toast.error('Date is invalid', {
            description: 'Please enter a valid date in ISO format',
          });
          setInputValue(format(selectedDate, 'yyyy-MM-dd'));
        } else {
          setSelectedDate(date);
          onDateChange(date.valueOf());
        }
      }}
    />
  }

  const handleYearChange = (year: number) => {
    const newDate = new Date(selectedDate.setFullYear(year));
    setSelectedDate(newDate);
    onDateChange(newDate.valueOf());
  };

  const handleMonthChange = (month: number) => {
    const newDate = new Date(selectedDate.setMonth(month));
    setSelectedDate(newDate);
    onDateChange(newDate.valueOf());
  };

  const handleDayChange = (day: number) => {
    const newDate = new Date(selectedDate.setDate(day));
    setSelectedDate(newDate);
    onDateChange(newDate.valueOf());
  };

  const years = eachYearOfInterval({
    start: new Date(app.timeline.frame.min),
    end: new Date(app.timeline.frame.max),
  }).reverse();

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
      <Select onValueChange={(value) => handleYearChange(parseInt(value))} defaultValue={selectedDate.getFullYear().toString()}>
        <SelectTrigger>{selectedDate.getFullYear() || 'Select year'}</SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year.getFullYear()} value={year.getFullYear().toString()}>
              {year.getFullYear()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month select */}
      <Select onValueChange={(value) => handleMonthChange(parseInt(value))} defaultValue={selectedDate.getMonth().toString()}>
        <SelectTrigger>{format(selectedDate, 'MMMM') || 'Select Month'}</SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.getMonth()} value={month.getMonth().toString()}>
              {format(month, 'MMMM')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Day select */}
      <Select onValueChange={(value) => handleDayChange(parseInt(value))} defaultValue={selectedDate.getDate().toString()}>
        <SelectTrigger>{selectedDate.getDate() || 'Select Day'}</SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem key={day.getDate()} value={day.getDate().toString()}>
              {day.getDate()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
