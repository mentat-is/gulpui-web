import { Engine } from "@/class/Engine.dto";
import { useApplication } from "@/context/Application.context";
import { enginesBase } from "@/dto/Engine.dto";
import { Button } from "@/ui/Button";
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from "@/ui/Color";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Stack } from "@impactium/components";
import { Switch } from "@/ui/Switch";
import { Gradients, GradientsMap } from "@/ui/utils";
import { Icon } from "@impactium/icons";
import { CSSProperties, useEffect } from "react";
import s from './styles/GeneralSettings.module.css'

export function GeneralSettings() {
  const { app, Info } = useApplication();

  useEffect(() => {
    localStorage.setItem('settings.__engine', app.general.settings.engine);
    localStorage.setItem('settings.__color', app.general.settings.color)
  }, [app.general.settings]);

  const fontStyle: CSSProperties = {
    fontSize: 14,
    whiteSpace: 'nowrap',
    flex: 1
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='glass' img='Settings' style={{ position: 'absolute', top: 32, right: 32 }}>General settings</Button>
      </PopoverTrigger>
      <PopoverContent>
        <Stack dir='column' gap={12} className={s.generalSettings}>
          <Stack ai='center' gap={12}>
            <span style={fontStyle}>Renderer by default:</span>
            <Select onValueChange={(v: Engine.List) => Info.setDefaultEngine(v)} value={app.general.settings.engine}>
              <SelectTrigger>
                <SelectValue placeholder="Choose renderer" />
              </SelectTrigger>
              <SelectContent>
                {enginesBase.map(i => <SelectItem key={i.title} value={i.plugin}><Icon name={i.img} />{i.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Stack>
          <Stack ai='center'>
            <span style={fontStyle}>Color palette by default:</span>
            <ColorPicker color={app.general.settings.color} setColor={c => Info.setDefaultColor(c as Gradients)}>
              <ColorPickerTrigger />
              <ColorPickerPopover gradients={GradientsMap} solids={[]} />
            </ColorPicker>
          </Stack>
          <Stack ai='center'>
            <span style={fontStyle}>Reverse scroll:</span>
            <Switch checked={app.timeline.isScrollReversed} onCheckedChange={Info.useReverseScroll} />
          </Stack>
        </Stack>
      </PopoverContent>
    </Popover>
  )
}