import { Application } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import s from './styles/SettingsFileBanner.module.css'
import { FilterFileBanner } from './FilterFile.banner'
import { Select } from '@/ui/Select'
import { Separator } from '@/ui/Separator'
import { enginesBase } from '@/dto/Engine.dto'
import { formatDuration, intervalToDuration } from 'date-fns'
import { Icon } from '@impactium/icons'
import { Engine } from '@/class/Engine.dto'
import { Button } from '@/ui/Button'
import { Skeleton } from '@/ui/Skeleton'
import { Stack } from '@/ui/Stack'
import { Input } from '@/ui/Input'
import { Source } from '@/entities/Source'
import { Doc } from '@/entities/Doc'
import { Context } from '@/entities/Context'
import { Color } from '@/entities/Color'

interface SettingsFileBannerProps {
  file: Source.Type
}

export function SettingsFileBanner({ file }: SettingsFileBannerProps) {
  const { Info, app, spawnBanner, destroyBanner } = Application.use()
  const [render_color_palette, setRenderColorPalette] = useState<any>(file.settings.render_color_palette)
  const [offset, setOffset] = useState<number>(file.settings.offset)
  const [render_engine, setEngine] = useState<Engine.List>(file.settings.render_engine)
  const [loading, setLoading] = useState<boolean>(false)

  const save = () => {
    setLoading(true)

    setTimeout(() => {
      Info.file_set_settings(file.id, {
        render_color_palette,
        render_engine,
        offset,
        field,
      })

      destroyBanner()
    }, 500)
  }

  const [eventKeys, setEventKeys] = useState<string[] | null>(null);

  useEffect(() => {
    Info.event_keys(file).then(Object.keys).then(keys => keys.sort((a, b) => a.localeCompare(b))).then(setEventKeys);
  }, []);

  const [field, setField] = useState<keyof Doc.Type>(file.settings.field);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target

    setOffset(parseInt(value) || 0)
  }

  const done = (
    <Button variant="glass" onClick={save} loading={loading} icon="Check" />
  )

  const option = (
    <Button
      onClick={() => spawnBanner(<FilterFileBanner files={[file]} />)}
      variant="secondary"
      icon="Filter"
    />
  )

  const EventFieldsSelection = useMemo(() => {
    if (!eventKeys) {
      return (
        <Skeleton width='full' />
      )
    }

    return (
      <Select.Root onValueChange={(field: keyof Doc.Type) => setField(field)} defaultValue={field.toString()}>
        <Select.Trigger className={s.trigger} value={field}>
          <Icon name='Dot' />
          {field}
        </Select.Trigger>
        <Select.Content>
          {eventKeys.map((field) => (
            <Select.Item key={field} value={field}>
              <Icon name='Dot' />
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
    <UIBanner title="Source.Entity settings" done={done} option={option}>
      <h4>
        {file.name} in {Context.Entity.id(app, file.context_id)?.name}
      </h4>
      <Stack dir='column' gap={8} ai='flex-start'>
        <p>
          Offset:{' '}
          {formatDuration(intervalToDuration({ start: 0, end: offset }), {
            format: ['years', 'months', 'days', 'hours', 'minutes', 'seconds'],
            zero: false,
          }) +
            ' ' +
            parseInt(offset.toString().slice(-3)) +
            ' milliseconds'}
        </p>
        <Input
          variant='highlighted'
          icon="AlarmClockPlus"
          accept="number"
          value={offset}
          placeholder="Offset time in ms"
          onChange={handleInputChange}
        />
      </Stack>
      <Separator />
      <Select.Root onValueChange={(v: Engine.List) => setEngine(v)} value={render_engine}>
        <Select.Trigger className={s.trigger}>
          <Icon name={enginesBase.find((e) => e.plugin === render_engine)?.img ?? 'CircleDashed'} />
          {enginesBase.find((e) => e.plugin === render_engine)?.title ?? render_engine}
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
        <ColorPicker color={render_color_palette} setColor={(c) => setRenderColorPalette(c as Color.Gradient)}>
          <ColorPickerTrigger />
          <ColorPickerPopover gradients={Color.GRADIENT} solids={[]} />
        </ColorPicker>
      </Stack>
      <Stack jc="space-between">
        <p className={s.text}>Target field:</p>
        {EventFieldsSelection}
      </Stack>
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
