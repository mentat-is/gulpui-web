import { Internal } from '@/class/Info'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { useEffect, useState } from 'react'

export namespace Settings {
  export namespace Banner {
    export type Props = UIBanner.Props
  }
  export function Banner({ ...props }: Settings.Banner.Props) {
    const [crosshair, setCrosshair] = useState<boolean>(Internal.Settings.crosshair);
    const [isUTCTimestamps, setIsUTCTimestamps] = useState<boolean>(Internal.Settings.isUTCTimestamps);

    useEffect(() => {
      Internal.Settings.crosshair = crosshair
    }, [crosshair])

    return (
      <UIBanner title="Settings" {...props}>
        <Toggle
          option={['Use cursor', 'Use crosshair']}
          checked={crosshair}
          onCheckedChange={setCrosshair}
        />
        <Toggle
          option={['Local timestamps', 'UTC timestamps']}
          checked={isUTCTimestamps}
          onCheckedChange={setIsUTCTimestamps}
        />
      </UIBanner>
    )
  }
}
