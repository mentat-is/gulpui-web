import { Application } from "@/context/Application.context";
import { Banner as UIBanner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Stack } from "@/ui/Stack";

export namespace Debug {
  export namespace Banner {
    export interface Props extends UIBanner.Props {

    }
  }
  export function Banner({ ...props }: Debug.Banner.Props) {
    const { Info } = Application.use();

    return (
      <UIBanner title='Deburger' {...props}>
        <Stack dir='column' gap={8}>
          <Button style={{ width: '100%' }} variant='secondary' onClick={Info.notes_reload} icon='StickyNote'>Reload notes</Button>
          <Button style={{ width: '100%' }} variant='secondary' onClick={Info.links_reload} icon='GitBranch'>Reload links</Button>
          <Button style={{ width: '100%' }} variant='secondary' onClick={Info.highlights_reload} icon='AlignHorizontalSpaceAround'>Reload highlights</Button>
          <Button style={{ width: '100%' }} variant='secondary' onClick={Info.plugin_list} icon='Puzzle'>Reload plugins</Button>
        </Stack>
      </UIBanner>
    )
  }
}
