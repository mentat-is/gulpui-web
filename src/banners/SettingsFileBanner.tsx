import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Button, Skeleton } from '@impactium/components'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import s from './styles/SettingsFileBanner.module.css'
import { FilterFileBanner } from './FilterFile.banner'
import { Card } from '@/ui/Card'
import { Select } from '@/ui/Select'
import { Gradients, GradientsMap } from '@/ui/utils'
import { Input } from '@impactium/components'
import { Separator } from '@/ui/Separator'
import { enginesBase } from '@/dto/Engine.dto'
import { formatDuration, intervalToDuration } from 'date-fns'
import { Icon } from '@impactium/icons'
import { Context, Event } from '@/class/Info'
import { Engine } from '@/class/Engine.dto'
import { Stack } from '@impactium/components'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { λFile } from '@/dto/Dataset'

interface SettingsFileBannerProps {
  file: λFile
}

export function SettingsFileBanner({ file }: SettingsFileBannerProps) {
  const { Info, app, spawnBanner, destroyBanner } = useApplication()
  const [color, setColor] = useState<any>(file.color)
  const [offset, setOffset] = useState<number>(file.settings.offset)
  const [engine, setEngine] = useState<Engine.List>(file.settings.engine)
  const [loading, setLoading] = useState<boolean>(false)

  const save = () => {
    setLoading(true)

    setTimeout(() => {
      Info.file_set_settings([file.id], {
        color,
        offset,
        engine,
        field,
      })

      destroyBanner()
    }, 500)
  }

  const [eventKeys, setEventKeys] = useState<string[] | null>(null);

  useEffect(() => {
    Info.event_keys(file).then(Object.keys).then(setEventKeys);
  }, []);

  const [field, setField] = useState<keyof λEvent>(file.settings.field)

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target

    setOffset(parseInt(value) || 0)
  }

  const done = (
    <Button variant="glass" onClick={save} loading={loading} img="Check" />
  )

  const option = (
    <Button
      onClick={() => spawnBanner(<FilterFileBanner file={file} />)}
      variant="secondary"
      img="Filter"
    />
  )

  const EventFieldsSelection = useMemo(() => {
    if (!eventKeys) {
      return (
        <Skeleton width='full' />
      )
    }

    return (
      <Select.Root onValueChange={(field: keyof λEvent) => setField(field)}>
        <Select.Trigger className={s.trigger} value={engine}>
          <Select.Value placeholder={field} />
        </Select.Trigger>
        <Select.Content>
          {eventKeys.map((field) => (
            <Select.Item key={field} value={field}>
              {field}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    )
  }, [eventKeys, field]);

  const manageRenderRulesButtonClickHandler = () => {
    spawnBanner(<RenderRules.Banner back={() => spawnBanner(<SettingsFileBanner file={file} />)} />)
  }

  return (
    <UIBanner title="File settings" done={done} option={option}>
      <h4>
        {file.name} in {Context.id(app, file.context_id)?.name}
      </h4>
      <Card>
        <p className={s.text}>
          File offset:{' '}
          {formatDuration(intervalToDuration({ start: 0, end: offset }), {
            format: ['years', 'months', 'days', 'hours', 'minutes', 'seconds'],
            zero: false,
          }) +
            ' ' +
            parseInt(offset.toString().slice(-3)) +
            ' milliseconds'}
        </p>
        <Input
          img="AlarmClockPlus"
          accept="number"
          value={offset}
          placeholder="Offset time in ms"
          onChange={handleInputChange}
        />
      </Card>
      <Separator />
      <Select.Root onValueChange={(v: Engine.List) => setEngine(v)} value={engine}>
        <Select.Trigger className={s.trigger}>
          <Stack>
            <Icon
              name={
                enginesBase.find((e) => e.plugin === engine)?.img ??
                'CircleDashed'
              }
            />
            <p>
              {enginesBase.find((e) => e.plugin === engine)?.title ?? engine}
            </p>
          </Stack>
        </Select.Trigger>
        <Select.Content>
          {enginesBase.map((i) => (
            <Select.Item value={i.plugin} key={i.plugin}>
              <Stack>
                <Icon name={i.img} />
                <p>{i.title}</p>
              </Stack>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Separator />
      <Stack jc="space-between">
        <p className={s.text}>Color palette:</p>
        <ColorPicker color={color} setColor={(c) => setColor(c as Gradients)}>
          <ColorPickerTrigger />
          <ColorPickerPopover gradients={GradientsMap} solids={[]} />
        </ColorPicker>
      </Stack>
      <Stack jc="space-between">
        <p className={s.text}>Target field:</p>
        {EventFieldsSelection}
      </Stack>
      <Button onClick={manageRenderRulesButtonClickHandler} img='BarChart'>Manage render rules</Button>
    </UIBanner>
  )
}

export namespace RenderRules {
  export namespace Banner {
    export interface Props extends UIBanner.Props {

    }
  }

  export function Banner({ ...props }: Banner.Props) {
    return (
      <UIBanner title='Manage render rules' {...props}>

      </UIBanner>
    )
  }
}