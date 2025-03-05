import { Internal } from '@/class/Info'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { useEffect, useState } from 'react'

export namespace Settings {
  export namespace Banner {
    export type Props = UIBanner.Props
  }
  export function Banner({ ...props }: Settings.Banner.Props) {
    const [crosshair, setCrosshair] = useState<boolean>(
      Internal.Settings.crosshair,
    )

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
      </UIBanner>
    )
  }
}
