import { useApplication } from '@/context/Application.context';
import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color';
import { ChangeEvent, useState } from 'react';
import s from './styles/SettingsFileBanner.module.css'
import { FilterFileBanner } from './FilterFile.banner';
import { Card } from '@/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Gradients, GradientsMap } from '@/ui/utils';
import { Input } from '@impactium/components';
import { Separator } from '@/ui/Separator';
import { enginesBase } from '@/dto/Engine.dto';
import { formatDuration, intervalToDuration } from 'date-fns';
import { Icon } from '@impactium/icons';
import { Context, Event } from '@/class/Info';
import { Engine } from '@/class/Engine.dto';
import { Stack } from '@impactium/components';
import { λEvent } from '@/dto/ChunkEvent.dto';
import { λFile } from '@/dto/Dataset';

interface SettingsFileBannerProps {
  file: λFile;
}

export function SettingsFileBanner({ file }: SettingsFileBannerProps) {
  const { Info, app, spawnBanner, destroyBanner } = useApplication();
  const [color, setColor] = useState<any>(file.color);
  const [offset, setOffset] = useState<number>(file.settings.offset);
  const [engine, setEngine] = useState<Engine.List>(file.settings.engine);
  const [field, setField] = useState<keyof λEvent>(file.settings.field);
  const [loading, setLoading] = useState<boolean>(false);

  const save = () => {
    setLoading(true);

    setTimeout(() => {
      Info.file_set_settings([file.id], {
          color,
          offset,
          engine,
          field
      });

      destroyBanner();
    }, 500);
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setOffset(parseInt(value) || 0);
  }

  const done = <Button variant='glass' onClick={save} loading={loading} img='Check' />;

  const option = (
    <Button
      onClick={() => spawnBanner(<FilterFileBanner file={file} />)}
      variant='secondary'
      img='Filter' />
  )
  
  return (
    <Banner title='File settings' done={done} option={option}>
      <h4>{file.name} in {Context.id(app, file.context_id)?.name}</h4>
      <Card>
        <p className={s.text}>File offset: {formatDuration(intervalToDuration({ start: 0, end: offset }), { format: ['years', 'months', 'days', 'hours', 'minutes', 'seconds'], zero: false }) + ' ' + parseInt(offset.toString().slice(-3)) + ' milliseconds'}</p>
        <Input img='AlarmClockPlus' accept='number' value={offset} placeholder='Offset time in ms' onChange={handleInputChange} />
      </Card>
      <Separator />
      <Card className={s.engines}>
        <p className={s.text}>Renderer:</p>
        <Select onValueChange={(v: Engine.List) => setEngine(v)} value={engine}>
          <SelectTrigger className={s.trigger}>
            <SelectValue placeholder='Choose renderer' />
          </SelectTrigger>
          <SelectContent>
            {enginesBase.map(i => <SelectItem value={i.plugin}><Icon name={i.img} />{i.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>
      <Separator />
      <Card className={s.color}>
        <Stack jc='space-between'>
          <p className={s.text}>Color palette:</p>
          <ColorPicker color={color} setColor={c => setColor(c as Gradients)}>
            <ColorPickerTrigger />
            <ColorPickerPopover gradients={GradientsMap} solids={[]} />
          </ColorPicker>
        </Stack>
        <Stack jc='space-between'>
          <p className={s.text}>Target field:</p>
          <Select onValueChange={(field: keyof λEvent) => setField(field)}>
            <SelectTrigger className={s.trigger} value={engine}>
              <SelectValue placeholder={field} />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(Event.get(app, file.id)[0] || {}).map(field => <SelectItem value={field}>{field}</SelectItem>)}
            </SelectContent>
          </Select>
        </Stack>
      </Card>
    </Banner>
  )
}