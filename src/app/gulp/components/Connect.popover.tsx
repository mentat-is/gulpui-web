import { File, Link } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { λLink } from "@/dto/Dataset";
import { PopoverContent } from "@/ui/Popover";
import { Button } from "@impactium/components";

export namespace ConnectPopover {
  export interface Props {
    event: λEvent;
  }
}

export function ConnectPopover({ event }: ConnectPopover.Props) {
  const { app, Info } = useApplication();

  const links = Link.selected(app);

  const connect = (link: λLink) => () => {
    Info.links_connect(link, event);
  }

  return (
    <PopoverContent>
      {links.map(link => {
        return <Button variant='secondary' style={{ color: link.color }} onClick={connect(link)} img={Link.icon(link)}>{link.name}</Button>
      })}
    </PopoverContent>
  )
}