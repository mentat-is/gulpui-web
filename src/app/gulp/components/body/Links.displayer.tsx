import { Link as LinkClass, Source } from "@/class/Info";
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
        const left = getPixelPosition(LinkClass.timestamp(link) + (Source.id(app, link.source_id)?.settings.offset || 0));
        let top = 0;

        if (link.events.some(e => !Source.id(app, e.source_id)?.selected)) return null;

        link.events.forEach(event => top += Source.getHeight(app, event.source_id, scrollY));

        if (top <= 0) return null;

        return <Link link={link} left={left} top={top / Math.max(link.events.length, 1)} />;
      })}
    </Fragment>
  )
}
