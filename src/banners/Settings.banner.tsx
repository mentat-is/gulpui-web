import { Internal } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Banner as UIBanner } from "@/ui/Banner";
import { Toggle } from "@/ui/Toggle";
import { useState } from "react";

export namespace Settings {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      
    }
  }
  export function Banner({ ...props }: Settings.Banner.Props) {
    const { Info, app } = useApplication();
    const [shittyCrosshair, setShittyCrosshair] = useState<boolean>(Internal.Settings.crosshair)

    return (
      <UIBanner title='Settings' {...props}>
        <Toggle option={['Cool cursor', 'Not cool cursor']} checked={Internal.Settings.crosshair} onCheckedChange={v => Internal.Settings.crosshair = v} />
      </UIBanner>
    )
  }
}