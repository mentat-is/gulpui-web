import { useApplication } from "@/context/Application.context";
import { λFile } from "@/dto/File.dto";
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
import { Engine, enginesBase } from '@/dto/Engine.dto';
import { formatDuration, intervalToDuration } from "date-fns";

interface SettingsFileBannerProps {
  file: λFile;
}

export function SettingsFileBanner({ file }: SettingsFileBannerProps) {
  const { Info, app, spawnBanner, destroyBanner } = useApplication();
  const [color, setColor] = useState<string>(file.color);
  const [offset, setOffset] = useState<number>(file.offset);
  const [engine, setEngine] = useState<Engine>(file.engine);

  const save = () => {
    Info.files_replace({
      ...file,
      color: color as Gradients,
      offset,
      engine
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
        onClick={() => spawnBanner(<FilterFileBanner file={file} />)}
        variant='ghost'
        img='Filter'>{(app.target.filters[file.uuid] || []).length ? 'Change filters' : 'Set filters'}</Button>
      }>
      <ColorPicker color={color} setColor={setColor}>
        <ColorPickerTrigger />
        <ColorPickerPopover gradients={GradientsMap} solids={[]} />
      </ColorPicker>
      <Separator />
      <Card>
        <p className={s.text}>File offset: {formatDuration(intervalToDuration({ start: 0, end: offset }), { format: ['days', 'hours', 'minutes', 'seconds'], zero: false }) + ' ' + parseInt(offset.toString().slice(-3)) + ' milliseconds'}</p>
        <div className={s.offset}>
          <Input img='AlarmClockPlus' accept='number' value={offset > 0 ? offset : undefined} placeholder='Offset time in ms' onChange={handleInputChange} />
          <Button variant='outline' onClick={() => setOffset(o => o + 1000)}>+1 sec</Button>
          <Button variant='outline' onClick={() => setOffset(o => o + 1000 * 60)}>+1 min</Button>
          <Button variant='outline' onClick={() => setOffset(o => o + 1000 * 60 * 60)}>+1 hour</Button>
          <Button variant='outline' onClick={() => setOffset(o => o + 1000 * 60 * 60 * 24)}>+1 day</Button>
        </div>
      </Card>
      <Separator />
      <Card className={s.engines}>
        <p className={s.text}>Renderer:</p>
        <Select onValueChange={(v: Engine) => setEngine(v)} value={engine}>
          <SelectTrigger className={s.trigger}>
            <SelectValue placeholder="Choose renderer" />
          </SelectTrigger>
          <SelectContent>
            {enginesBase.map(i => <SelectItem value={i.plugin}><Button variant='ghost' img={i.img}>{i.title}</Button></SelectItem>)}
          </SelectContent>
        </Select>
      </Card>
      <Button img='FileBox' onClick={save}>Save</Button>
    </Banner>
  )
}