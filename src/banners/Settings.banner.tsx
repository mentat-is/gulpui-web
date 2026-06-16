import { Application } from '@/context/Application.context'
import { Theme } from '@/context/Theme.context'
import { Internal } from '@/entities/addon/Internal'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { Input } from '@/ui/Input'
import { Stack } from '@/ui/Stack'
import { Label } from '@/ui/Label'
import { Select } from '@/ui/Select'
import { Locale, localeList } from '@/locales'
import { useState } from 'react'

export namespace Settings {
  export namespace Banner {
    export type Props = UIBanner.Props
  }
  export function Banner({ ...props }: Settings.Banner.Props) {
    const { app, Info } = Application.use()
    const { t, language, setLanguage } = Locale.use()
    const [isUTCTimestamps, setIsUTCTimestamps] = useState<boolean>(Internal.Settings.isUTCTimestamps);

    const isRealtime = !!app.settings.realtimeEnabled;
    const timeoff = app.settings.realtimeTimeoff ?? 30;
    const [timeoffInput, setTimeoffInput] = useState<string>(String(timeoff));

    const timeoffValue = parseInt(timeoffInput, 10);
    const isTimeoffValid = !isNaN(timeoffValue) && timeoffValue >= 10;

    return (
      <UIBanner title={t("settings.title")} {...props}>
        <Toggle
          option={[t("settings.timestamps.local"), t("settings.timestamps.utc")]}
          checked={isUTCTimestamps}
          onCheckedChange={(v) => {
            setIsUTCTimestamps(v)
            Internal.Settings.isUTCTimestamps = v
          }}
        />
        <Toggle
          option={[t("settings.scroll.normal"), t("settings.scroll.reverse")]}
          checked={app.timeline.isScrollReversed}
          onCheckedChange={Info.useReverseScroll}
        />
        <Toggle
          option={[t("settings.realtime.off"), t("settings.realtime.on")]}
          checked={isRealtime}
          onCheckedChange={(v) => {
            Info.setRealtime(v, timeoffValue);
          }}
        />
        <Input
          label={t("settings.timeoff.label")}
          placeholder={t("settings.timeoff.placeholder")}
          type="number"
          min={10}
          value={timeoffInput}
          disabled={!isRealtime}
          valid={!isRealtime || isTimeoffValid}
          onChange={(e) => {
            const val = e.target.value;
            setTimeoffInput(val);
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed) && parsed >= 10 && isRealtime) {
              Info.setRealtime(true, parsed);
            }
          }}
        />
        <Stack jc='space-between' ai='center'>
          <Label value={t("settings.theme")} />
          <Theme.Selector />
        </Stack>
        <Stack jc='space-between' ai='center'>
          <Label value={t("settings.language")} />
          <Select.Root value={language} onValueChange={setLanguage}>
            <Select.Trigger data-no-icon>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {localeList.map(({ code, label }) => (
                <Select.Item key={code} value={code}>{label}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Stack>
      </UIBanner>
    )
  }
}
