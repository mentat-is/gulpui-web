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
import { Icon } from "@/ui/Icon";
import { Context } from "@/class/Info";
import { Logger } from "@/dto/Logger.class";

interface SettingsFileBannerProps {
  file: λFile;
}

export function SettingsFileBanner({ file }: SettingsFileBannerProps) {
  const { Info, app, spawnBanner, destroyBanner } = useApplication();
  const [color, setColor] = useState<Gradients>(file.color);
  const [offset, setOffset] = useState<number>(file.offset);
  const [engine, setEngine] = useState<Engine>(file.engine);

  const save = () => {
    const newFile = { color, offset, engine };

    Logger.log(`Settings for file has been successfully updated.
File: ${file.name}-${file.uuid}
Settings: ${JSON.stringify(newFile, null, 2)}`, SettingsFileBanner.name);

    Info.files_replace({
      ...file,
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
        onClick={() => spawnBanner(<FilterFileBanner file={file} />)}
        variant='ghost'
        img='Filter'>{(app.target.filters[file.uuid] || []).length ? 'Change filters' : 'Set filters'}</Button>
      }>
      <h4>{file.name} in {Context.findByPugin(app, file._uuid)?.name}</h4>
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
        <Select onValueChange={(v: Engine) => setEngine(v)} value={engine}>
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
        <p className={s.text}>Color palette:</p>
        <ColorPicker color={color} setColor={c => setColor(c as Gradients)}>
          <ColorPickerTrigger />
          <ColorPickerPopover gradients={GradientsMap} solids={[]} />
        </ColorPicker>
      </Card>
      <Button style={{ alignSelf: 'flex-end' }} img='CheckCheck' onClick={save}>Apply new file settings</Button>
    </Banner>
  )
}