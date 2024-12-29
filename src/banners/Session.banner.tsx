import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Button } from "@impactium/components";
import { useCallback } from "react";
import { AuthBanner } from "./Auth.banner";

export namespace SessionBanner {
  export interface Props extends Banner.Props {

  }
}

export function SessionBanner() {
  const { spawnBanner } = useApplication();

  const BackToAuthorization = useCallback(() => {
    const handleSubtitleButtonClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();

      spawnBanner(<AuthBanner />)
    }

    return (
      <Button variant='secondary' onClick={handleSubtitleButtonClick}>
        Back to authorization
      </Button>
    )
  }, []);

  return (
    <Banner title='Choose session' subtitle={<BackToAuthorization />}>
      
    </Banner>
  )
}