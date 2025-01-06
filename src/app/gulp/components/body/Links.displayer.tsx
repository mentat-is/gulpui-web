import { Link as LinkClass, File, Link, Event } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { LinkPoint } from '@/ui/Link';
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
        const events = Link.events(app, link);

        // const left = getPixelPosition(Link.timestamp(app, link) + (File.id(app, File.call.link.doc_id_from)?.settings.offset || 0));
        const left = 0;
        let top = 0;

        if (events.some(e => !File.id(app, e.file_id)?.selected)) return null;

        events.forEach(event => top += File.getHeight(app, event.file_id, scrollY));

        if (top <= 0) return null;

        return <LinkPoint link={link} x={left} y={top / Math.max(events.length, 1)} />;
      })}
    </Fragment>
  )
}
