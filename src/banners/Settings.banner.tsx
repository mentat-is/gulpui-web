import { Application } from '@/context/Application.context'
import { Internal } from '@/entities/addon/Internal'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { Input } from '@/ui/Input'
import { useState } from 'react'

export namespace Settings {
  export namespace Banner {
    export type Props = UIBanner.Props
  }
  export function Banner({ ...props }: Settings.Banner.Props) {
    const { app, Info } = Application.use()
    const [isUTCTimestamps, setIsUTCTimestamps] = useState<boolean>(Internal.Settings.isUTCTimestamps);

    const isRealtime = !!app.settings.realtimeEnabled;
    const timeoff = app.settings.realtimeTimeoff ?? 30;
    const [timeoffInput, setTimeoffInput] = useState<string>(String(timeoff));

    const timeoffValue = parseInt(timeoffInput, 10);
    const isTimeoffValid = !isNaN(timeoffValue) && timeoffValue >= 10;

    return (
      <UIBanner title="Settings" {...props}>
        <Toggle
          option={['Local timestamps', 'UTC timestamps']}
          checked={isUTCTimestamps}
          onCheckedChange={(v) => {
            setIsUTCTimestamps(v)
            Internal.Settings.isUTCTimestamps = v
          }}
        />
        <Toggle
          option={['Normal scroll', 'Reverse scroll']}
          checked={app.timeline.isScrollReversed}
          onCheckedChange={Info.useReverseScroll}
        />
        <Toggle
          option={['Realtime off', 'Realtime on']}
          checked={isRealtime}
          onCheckedChange={(v) => {
            Info.setRealtime(v, timeoffValue);
          }}
        />
        <Input
          label="Timeoff"
          placeholder="Polling interval in seconds (min 10)"
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
      </UIBanner>
    )
  }
}
