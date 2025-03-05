import { useState, useRef, useEffect } from 'react'
import { Banner } from '../ui/Banner'
import { Button, Stack } from '@impactium/components'
import { useApplication } from '../context/Application.context'
import { Input } from '@impactium/components'
import { Toggle } from '@/ui/Toggle'
import s from './styles/LimitsBanner.module.css'
import { Context, MinMax } from '@/class/Info'
import { format } from 'date-fns'
import { Logger } from '@/dto/Logger.class'
import { Icon } from '@impactium/icons'

export function LimitsBanner() {
  const { Info, destroyBanner, app } = useApplication()
  const [frame, setFrame] = useState<MinMax>(Context.frame(app))
  const [isMinValid, setIsMinValid] = useState<boolean>(true)
  const [isMaxValid, setIsMaxValid] = useState<boolean>(true)
  const [manual, setManual] = useState<boolean>(false)

  const map = [
    { text: 'Last day', do: () => save(frame.max - 24 * 60 * 60 * 1000) },
    { text: 'Last week', do: () => save(frame.max - 7 * 24 * 60 * 60 * 1000) },
    {
      text: 'Last month',
      do: () => save(frame.max - 30 * 24 * 60 * 60 * 1000),
    },
    { text: 'Full range', do: () => save() },
  ]

  const save = async (_min?: number) => {
    const { min, max } = { min: _min ?? frame.min, max: frame.max }
    Info.setTimelineFrame({ min, max })
    destroyBanner()
  }

  const validate = (type: keyof MinMax) => {
    if (type === 'min') {
      setIsMinValid(frame.min < frame.max)
    } else {
      setIsMaxValid(frame.max > frame.min)
    }
  }

  const handleDateChange = (type: keyof MinMax, value: number | string) => {
    try {
      const timestamp = new Date(value).valueOf()
      if (isNaN(timestamp) || timestamp === 0) {
        Logger.error(`Invalid date: ${value}`)
        validate(type)
        return
      }
      setFrame((prev) => ({ ...prev, [type]: timestamp }))
      validate(type)
    } catch {
      validate(type)
    }
  }

  function InputDateSelection({ type }: { type: keyof MinMax }) {
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
      const input = inputRef.current
      const icon = input?.parentElement?.querySelector('svg')

      const clickHandler = () => {
        if (input?.showPicker) {
          input.showPicker()
        }
      }

      icon?.addEventListener('click', clickHandler)

      return () => {
        icon?.removeEventListener('click', clickHandler)
      }
    }, [])

    return (
      <Input
        ref={inputRef}
        type="datetime-local"
        valid={type === 'min' ? isMinValid : isMaxValid}
        variant="highlighted"
        img="Calendar"
        value={format(frame[type], "yyyy-MM-dd'T'HH:mm")}
        onChange={(e) => handleDateChange(type, e.target.value)}
        className={s.input}
      />
    )
  }

  function TextDateSelection({ type }: { type: keyof MinMax }) {
    return (
      <Input
        type="text"
        valid={type === 'min' ? isMinValid : isMaxValid}
        value={new Date(frame[type]).toISOString()}
        img="CalendarCog"
        variant="highlighted"
        onChange={(e) => handleDateChange(type, e.target.value)}
        placeholder="Enter date in ISO format"
      />
    )
  }

  function DateSelection({ type }: { type: keyof MinMax }) {
    return manual ? (
      <TextDateSelection type={type} />
    ) : (
      <InputDateSelection type={type} />
    )
  }

  const Done = () => (
    <Button variant="glass" img="Check" onClick={() => save()} />
  )

  return (
    <Banner className={s.banner} title="Timeframe" done={<Done />}>
      <Toggle
        checked={manual}
        onCheckedChange={setManual}
        option={['Select dates', 'ISO String']}
      />
      <Stack className={s.wrapper}>
        <Icon name="CalendarArrowUp" />
        <span>From:</span>
        <DateSelection type="min" />
      </Stack>
      <Stack className={s.wrapper}>
        <Icon name="CalendarArrowDown" />
        <span>To:</span>
        <DateSelection type="max" />
      </Stack>
      <div className={s.button_group}>
        {map.map((option, index) => (
          <Button variant="outline" onClick={option.do} key={index}>
            {option.text}
          </Button>
        ))}
      </div>
    </Banner>
  )
}
