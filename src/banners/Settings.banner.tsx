import { Application } from '@/context/Application.context'
import { Internal } from '@/entities/addon/Internal'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { useState } from 'react'

export namespace Settings {
  export namespace Banner {
    export type Props = UIBanner.Props
  }
  export function Banner({ ...props }: Settings.Banner.Props) {
    const { app, Info } = Application.use()
    const [isUTCTimestamps, setIsUTCTimestamps] = useState<boolean>(Internal.Settings.isUTCTimestamps);

    return (
      <UIBanner title="Settings" {...props}>
        <Toggle
          option={['Local timestamps', 'UTC timestamps']}
          checked={isUTCTimestamps}
          onCheckedChange={setIsUTCTimestamps}
        />
        <Toggle
          option={['Normal scroll', 'Reverse scroll']}
          checked={app.timeline.isScrollReversed}
          onCheckedChange={Info.useReverseScroll}
        />
      </UIBanner>
    )
  }
}
