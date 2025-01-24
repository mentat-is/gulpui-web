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
        const event = Event.id(app, link.doc_id_from);
        if (!event) {
          return null;
        }

        const file = File.id(app, event.file_id);
        if (!file || !file.selected) {
          return null;
        }

        const timestamp = Link.timestamp(app, link);

        if (!timestamp) {
          return null;
        }

        const left = getPixelPosition(timestamp);

        const top = File.getHeight(app, file, scrollY);

        if (top <= 0) return null;

        return <LinkPoint key={link.id} link={link} x={left} y={top} />
      })}
    </Fragment>
  )
}
