import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from "@/ui/Color";
import { ChangeEvent, useState } from "react";
import s from './styles/SettingsFileBanner.module.css'
import { FilterFileBanner } from "./FilterFile.banner";
import { Card } from "@/ui/Card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Gradients, GradientsMap } from "@/ui/utils";
import { Input } from "@/ui/Input";
import { Separator } from "@/ui/Separator";
import { enginesBase } from '@/dto/Engine.dto';
import { formatDuration, intervalToDuration } from "date-fns";
import { Icon } from "@impactium/icons";
import { Context, Event } from "@/class/Info";
import { Logger } from "@/dto/Logger.class";
import { Engine } from "@/class/Engine.dto";
import { Stack } from "@impactium/components";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { Toggle } from "@/ui/Toggle";
import { λSource } from "@/dto/Operation.dto";

interface SettingsFileBannerProps {
  source: λSource;
}

export function SettingsFileBanner({ source }: SettingsFileBannerProps) {
  const { Info, app, spawnBanner, destroyBanner } = useApplication();
  const [color, setColor] = useState<any>(source.color);
  const [offset, setOffset] = useState<number>(source.settings.offset);
  const [engine, setEngine] = useState<Engine.List>(source.settings.engine);
  const [isCustomKeyField, setIsCustomKeyField] = useState<boolean>(false);
  const [key, setKey] = useState<string | string[]>(source.settings.focusField);

  const save = () => {
    const newFile = { color, offset, engine, key };

    Logger.log(`Settings for source has been successfully updated.
File: ${source.name}-${source.id}
Settings: ${JSON.stringify(newFile, null, 2)}`, SettingsFileBanner.name);

    Info.files_replace({
      ...source,
      ...newFile
    });
    destroyBanner();
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);

    if (value >= 0) {
      setOffset(value);
    };
  }
  
  return (
    <Banner title='File settings' subtitle={
      <Button
        onClick={() => spawnBanner(<FilterFileBanner source={source} />)}
        variant='ghost'
        img='Filter'>{(app.target.filters[source.id] || []).length ? 'Change filters' : 'Set filters'}</Button>
      }>
      <h4>{source.name} in {Context.find(app, source.context_id)?.name}</h4>
      <Card>
        <p className={s.text}>File offset: {formatDuration(intervalToDuration({ start: 0, end: offset }), { format: ['days', 'hours', 'minutes', 'seconds'], zero: false }) + ' ' + parseInt(offset.toString().slice(-3)) + ' milliseconds'}</p>
        <Input img='AlarmClockPlus' accept='number' value={offset > 0 ? offset : undefined} placeholder='Offset time in ms' onChange={handleInputChange} />
        <div className={s.offset}>
          <Button img='Plus' variant='outline' onClick={() => setOffset(o => o - 1000)}>1 second</Button>
          <Button img='Plus' variant='outline' onClick={() => setOffset(o => o - 1000 * 60)}>1 minute</Button>
          <Button img='Plus' variant='outline' onClick={() => setOffset(o => o - 1000 * 60 * 60)}>1 hour</Button>
          <Button img='Plus' variant='outline' onClick={() => setOffset(o => o - 1000 * 60 * 60 * 24)}>1 day</Button>
        </div>
        <div className={s.offset}>
          <Button img='Minus' variant='outline' onClick={() => setOffset(o => o + 1000)}>1 second</Button>
          <Button img='Minus' variant='outline' onClick={() => setOffset(o => o + 1000 * 60)}>1 minute</Button>
          <Button img='Minus' variant='outline' onClick={() => setOffset(o => o + 1000 * 60 * 60)}>1 hour</Button>
          <Button img='Minus' variant='outline' onClick={() => setOffset(o => o + 1000 * 60 * 60 * 24)}>1 day</Button>
        </div>
      </Card>
      <Separator />
      <Card className={s.engines}>
        <p className={s.text}>Renderer:</p>
        <Select onValueChange={(v: Engine.List) => setEngine(v)} value={engine}>
          <SelectTrigger className={s.trigger}>
            <SelectValue placeholder="Choose renderer" />
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
        <Toggle option={['Use key from list', 'Custom key (unsave)']} checked={isCustomKeyField} onCheckedChange={setIsCustomKeyField}  />
        <Stack jc='space-between'>
          <p className={s.text}>Target key:</p>
          {isCustomKeyField
            ? <Input placeholder='Render engine target key' />
            : <Select onValueChange={(field: keyof λEvent) => setKey(field)}>
                <SelectTrigger className={s.trigger} value={engine}>
                  <SelectValue placeholder="event.code" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(Event.get(app, source.id)[0] || {}).map(key => <SelectItem value={key}>{key}</SelectItem>)}
                </SelectContent>
              </Select>
          }
        </Stack>
      </Card>
      <Button style={{ alignSelf: 'flex-end' }} img='CheckCheck' onClick={save}>Apply new source settings</Button>
    </Banner>
  )
}