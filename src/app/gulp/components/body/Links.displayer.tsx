import { Link as LinkClass, File } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Link } from '@/ui/Link';
import { Fragment } from 'react';


interface LinksDisplayerProps {
  getPixelPosition: (num: number) => number;
  scrollY: number;
}

export function LinksDisplayer({ getPixelPosition, scrollY }: LinksDisplayerProps) {
  const { app } = useApplication();

  return (
    <Fragment>
      {app.target.links.map(link => {
        const left = getPixelPosition(LinkClass.timestamp(link) + (File.id(app, link.file_id)?.settings.offset || 0));
        let top = 0;

        if (link.events.some(e => !File.id(app, e.file_id)?.selected)) return null;

        link.events.forEach(event => top += File.getHeight(app, event.file_id, scrollY));

        if (top <= 0) return null;

        return <Link link={link} left={left} top={top / Math.max(link.events.length, 1)} />;
      })}
    </Fragment>
  )
}
