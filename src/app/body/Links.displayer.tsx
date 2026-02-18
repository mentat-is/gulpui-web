import { Application } from '@/context/Application.context'
import { Doc } from '@/entities/Doc'
import { Link } from '@/entities/Link'
import { Source } from '@/entities/Source'
import { LinkPoint } from '@/ui/Link'
import { useState, useEffect, useRef, Fragment } from 'react'

interface LinksDisplayerProps {
  getPixelPosition: (num: number) => number
}

/**
 * Renders interactive link point overlays on top of the canvas.
 * Each link shows exactly ONE clickable LinkPoint, positioned at the
 * geometric center of its connected documents on the drawn link line.
 *
 * ARCHITECTURE: Uses a debounced useEffect + useState pattern instead of useMemo.
 *
 * WHY NOT useMemo: The link data computation calls Doc.Entity.id() which reads
 * from Doc.Entity._index (populated by Doc.Entity.add()). However, the events
 * Map (`app.target.events`) is mutated in place — same reference, same .size —
 * so no useMemo dependency can reliably detect when events finish loading.
 * useMemo would cache an empty result on first compute and never recompute.
 *
 * The useEffect approach triggers on every `app` state change (which happens
 * when events load via setInfoByKey). A 500ms debounce ensures the computation
 * only runs after scroll/zoom movement stops, keeping performance optimal.
 */
export function LinksDisplayer({ getPixelPosition }: LinksDisplayerProps) {
  const { app, scrollY } = Application.use()

  const [points, setPoints] = useState<Array<{ link: Link.Type; x: number; y: number }>>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending computation
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // If links are hidden or empty, clear immediately (no debounce)
    if (!app.target.links.length || app.hidden.links) {
      setPoints([]);
      return;
    }

    // Debounce: recompute positions 500ms after the last scroll/data change.
    // This ensures the displayer only repositions after timeline movement stops,
    // avoiding visual noise during active scroll/zoom.
    debounceRef.current = setTimeout(() => {
      const selectedFiles = new Set(
        app.target.files.filter((f) => f.selected).map((f) => f.id)
      );

      const result: Array<{ link: Link.Type; x: number; y: number }> = [];

      for (const link of app.target.links) {
        const ev = Doc.Entity.id(app, link.doc_id_from);
        if (!ev || !selectedFiles.has(ev['gulp.source_id'])) continue;

        // Collect pixel positions and Y-heights for all valid docs in this link
        const xs: number[] = [];
        const ys: number[] = [];

        for (const docId of link.doc_ids) {
          const doc = Doc.Entity.id(app, docId);
          if (!doc) continue;

          xs.push(getPixelPosition(doc.timestamp ?? 0));
          ys.push(Source.Entity.getHeight(app, doc['gulp.source_id'], scrollY));
        }

        if (xs.length < 2) continue;
        
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

      setPoints(result);
    }, 1);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [app, getPixelPosition, scrollY]);

  return (
    <Fragment>
      {points.map(({ link, x, y }, i) => (
        <LinkPoint type='link' key={link.id ?? i} link={link} x={x} y={y} />
      ))}
    </Fragment>
  )
}
