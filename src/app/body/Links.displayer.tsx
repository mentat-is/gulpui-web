import { File, Event } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λLink } from '@/dto/Dataset'
import { LinkPoint } from '@/ui/Link'
import { useMemo, Fragment } from 'react'

interface LinksDisplayerProps {
  getPixelPosition: (num: number) => number
}

export function LinksDisplayer({ getPixelPosition }: LinksDisplayerProps) {
  const { app, scrollY } = useApplication()

  if (!app.target.links.length || app.hidden.links) return null

  const selectedFiles = useMemo(
    () => new Set(app.target.files.filter((f) => f.selected).map((f) => f.id)),
    [app.target.files],
  )

  const points = useMemo(() => {
    const result: Array<{ link: λLink; x: number; y: number }> = [];

    for (const link of app.target.links) {
      const ev = Event.id(app, link.doc_id_from);
      if (!ev || !selectedFiles.has(ev['gulp.source_id'])) continue;

      const ys = link.doc_ids.map(d => File.getHeight(app, Event.id(app, d)?.['gulp.source_id'], 0));
      const xs = link.doc_ids.map(d => getPixelPosition(Event.id(app, d)?.timestamp ?? 0));
      if (ys.length < 2 || xs.length < 2) continue;

      for (let i = 0; i < ys.length - 1; i++) {
        const x1 = xs[i];
        const y1 = ys[i];

        const x2 = xs[i + 1]
        const y2 = ys[i + 1]

        const x = (x1 + x2) / 2;
        const y = (y1 + y2) / 2;
        result.push({ link, x, y });
      }
    }

    return result;
  }, [app.target.links, app.timeline.filter, selectedFiles, getPixelPosition]);

  return (
    <Fragment>
      {points.map(({ link, x, y }, i) => (
        <LinkPoint type='link' key={i} link={link} x={x} y={y - scrollY} />
      ))}
    </Fragment>
  )
}