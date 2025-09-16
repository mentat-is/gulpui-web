import { useApplication } from "@/context/Application.context";
import { Banner as UIBanner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Stack } from "@/ui/Stack";
import { useCallback } from "react";

export default function () {
  const { app, spawnBanner } = useApplication();

  const buttonClickHandler = useCallback(() => {
    spawnBanner(<Example.Banner />);
  }, [spawnBanner])

  return (
    <Button img='Triangle' variant='glass' onClick={buttonClickHandler} />
  )
}

namespace Example {
  export namespace Banner {
    export interface Props extends UIBanner.Props {

    }
  }
  export function Banner({ ...props }: Example.Banner.Props) {
    const { destroyBanner } = useApplication();

    return (
      <Banner title='This is example plugin' {...props}>
        <Stack style={{ width: '100%' }} ai='center' jc='center'>
          <Button variant='tertiary' img='X' onClick={destroyBanner}>Close</Button>
        </Stack>
      </Banner>
    )
  }
}