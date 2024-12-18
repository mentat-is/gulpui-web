import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Stack } from "@impactium/components";

export function StorylineBanner() {

  const done = <Button img='Download' />

  return (
    <Banner title='Storyline' done={done}>
      <Stack>

      </Stack>
    </Banner>
  )
}
