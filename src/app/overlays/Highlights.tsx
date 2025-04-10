import { Badge, Button, Input, Stack } from "@impactium/components";
import s from './Highlights.module.css';
import { Icon } from "@impactium/icons";
import { useMemo, useRef, useState } from "react";
import { Range } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Glyph } from "@/ui/Glyph";
import { Default, λGlyph, λHighlight } from "@/dto/Dataset";
import { Algorhithm } from "@/ui/utils";
import { cn } from "@impactium/utils";

export namespace Highlights {
  export namespace Create {
    export namespace Overlay {
      export interface Props extends Stack.Props {

      }
    }

    export function Overlay({ className, ...props }: Highlights.Create.Overlay.Props) {
      const { Info, setHighlightsOverlay, scrollX, scrollY } = useApplication();
      const [icon, setIcon] = useState<λGlyph['id'] | null>(null);
      const [name, setName] = useState<string>('');
      const [color, setColor] = useState<NonNullable<Badge.Variant>>('blue');
      const [range, setSelection] = useState<[number, number] | null>([100, 300]);
      const [isSelected, setIsSelected] = useState<boolean>(false);
      const overlay = useRef<HTMLDivElement>(null);

      const destroyOverlay = () => {
        setHighlightsOverlay(null)
      };

      const unselect = () => {
        setIsSelected(false);
        setSelection(null);
      }

      const submit = () => {
        if (!range) {
          return;
        }

        const algo = new Algorhithm({
          frame: Info.app.timeline.frame,
          scale: Info.app.timeline.scale,
          scroll: {
            x: scrollX,
            y: scrollY
          },
          width: Info.width
        })

        const time_range: Range = range.map(v => algo.timestamp_from_rel_x(v)) as unknown as Range;

        Info.highlight_create({
          name,
          color,
          icon,
          time_range
        });
      }

      const Hint = useMemo(() => {
        if (range) {
          return (
            <Stack className={s.hint} onMouseDown={e => e.stopPropagation()} pos='relative'>
              <Glyph.Chooser asButton icon={icon} setIcon={setIcon} />
              <Input placeholder='Highlight name' value={name} onChange={e => setName(e.target.value)} />
              <Button variant='glass' img='Check' onMouseDown={submit}>Submit</Button>
              <Button className={s.x} variant='secondary' img='X' onMouseDown={unselect} />
            </Stack>
          )
        }

        return (
          <Stack className={s.hint} onMouseDown={e => e.stopPropagation()} pos='relative'>
            <Icon name='ChartBarBig' />
            <code>Select area highlighted</code>
            <Button className={s.close} variant='secondary' size='sm' img='Logout' onMouseDown={destroyOverlay}>Exit</Button>
          </Stack>
        )
      }, [destroyOverlay, unselect, icon, name, setName, range, submit])

      const createHighlightOverlayMouseDownHandler = (event: React.MouseEvent) => {
        if (!overlay.current) {
          return;
        }

        setIsSelected(false);

        const rect = overlay.current.getBoundingClientRect();

        const x = Math.round(event.clientX - rect.x);

        setSelection([x, x]);
      }

      const createHighlightOverlayMouseUpHandler = () => {
        setIsSelected(true);
      }

      const createHighlightOverlayMouseMoveHandler = (event: React.MouseEvent) => {
        if (!overlay.current || isSelected || !range) {
          return;
        }

        const rect = overlay.current.getBoundingClientRect();

        const x = Math.round(event.clientX - rect.x);
        setSelection([range[0], x]);
      }

      const Highlight = useMemo(() => {
        if (!range) {
          return null;
        }

        return (
          <Highlights.Component highlight={{
            color,
            name,
            glyph_id: icon!,
            range
          } as unknown as λHighlight} />
        )
      }, [color, name, icon, range]);

      return (
        <Stack
          ref={overlay}
          className={cn(s.overlay, s.focus)}
          pos='absolute'
          onMouseDown={createHighlightOverlayMouseDownHandler}
          onMouseMove={createHighlightOverlayMouseMoveHandler}
          onMouseLeave={createHighlightOverlayMouseUpHandler}
          onMouseUp={createHighlightOverlayMouseUpHandler}
          {...props}>
          {Highlight}
          <Stack pos='absolute' className={s.hint_wrapper} jc='center'>
            {Hint}
          </Stack>
        </Stack>
      )
    }
  }

  export namespace List {
    export namespace Overlay {
      export interface Props extends Stack.Props {

      }
    }

    export function Overlay({ ...props }: Highlights.List.Overlay.Props) {
      const { app } = useApplication();

      const highlights = useMemo(() => {
        return app.target.highlights
      }, [app.target.highlights]);

      return (
        <Stack pos='absolute' className={s.overlay} {...props}>
          {highlights.map(highlight => {
            return (
              <Highlights.Component highlight={highlight} />
            )
          })}
        </Stack>
      )
    }
  }

  export namespace Component {
    export interface Props extends Stack.Props {
      highlight: λHighlight
    }
  }

  export function Component({ highlight, ...props }: Highlights.Component.Props) {
    const { Info, scrollX, scrollY } = useApplication();

    const range: Range = 'range' in highlight ? highlight.range as Range : highlight.time_range.map(t => {
      const algo = new Algorhithm({
        frame: Info.app.timeline.frame,
        scale: Info.app.timeline.scale,
        scroll: {
          x: scrollX,
          y: scrollY
        },
        width: Info.width
      });

      return algo.rel_x_from_timestamp(t);
    }) as Range;

    const left = Math.min(...range);

    const width = Math.max(...range) - left;

    return (
      <Stack pos='absolute' style={{ left, width }} className={s.highlight} jc='flex-end' ai='flex-start' {...props}>
        <Badge variant={highlight.color as Badge.Variant} value={highlight.name || 'Highlight'} icon={Glyph.List.get(highlight.glyph_id) || Default.Icon.HIGHLIGHT} />
      </Stack>
    )
  }
}