import { useApplication } from "@/context/Application.context";
import { Banner as UIBanner } from "@/ui/Banner";
import { Button, Stack } from "@impactium/components";

export namespace Debug {
  export namespace Banner {
    export interface Props extends UIBanner.Props {

    }
  }
  export function Banner({ ...props }: Debug.Banner.Props) {
    const { Info } = useApplication();

    return (
      <UIBanner title='Deburger' {...props}>
        <Stack dir='column' gap={8}>
          <Button style={{ width: '100%' }} variant='secondary' onClick={Info.notes_reload} img='StickyNote'>Reload notes</Button>
          <Button style={{ width: '100%' }} variant='secondary' onClick={Info.links_reload} img='GitBranch'>Reload links</Button>
          <Button style={{ width: '100%' }} variant='secondary' onClick={Info.highlights_reload} img='AlignHorizontalSpaceAround'>Reload highlights</Button>
          <Button style={{ width: '100%' }} variant='secondary' onClick={Info.plugin_list} img='Puzzle'>Reload plugins</Button>
        </Stack>
      </UIBanner>
    )
  }
}