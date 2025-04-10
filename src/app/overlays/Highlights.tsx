import { Badge, Button, Input, Stack } from "@impactium/components";
import s from './Highlights.module.css';
import { Icon } from "@impactium/icons";
import { useMemo, useRef, useState } from "react";
import { Range } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Glyph } from "@/ui/Glyph";
import { Default, λGlyph, λHighlight } from "@/dto/Dataset";
import { Algorhithm } from "@/ui/utils";
import { capitalize, cn } from "@impactium/utils";
import { Select } from "@/ui/Select";

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
              <Select.Root onValueChange={color => setColor(color as NonNullable<Badge.Variant>)}>
                <Select.Trigger value={color}>
                  <Icon name='Status' />
                  <p>{capitalize(color)}</p>
                </Select.Trigger>
                <Select.Content>
                  {["blue", "gray", "green", "pink", "purple", "red", "teal"].map(color => {
                    return (
                      <Select.Item value={color} style={{ color: `var(--${color}-700)`, background: `var(--${color}-200)` }}>
                        <Icon name='Status' />
                        <p>{capitalize(color)}</p>
                      </Select.Item>
                    )
                  })}
                </Select.Content>
              </Select.Root>
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

      const computedDepths = useMemo(() => {
        return computeDepths(highlights);
      }, [highlights]);

      // @ts-ignore
      window.highlights = []

      return (
        <Stack pos='absolute' className={s.overlay} {...props}>
          {highlights.map((highlight, index) => {
            return (
              <Highlights.Component highlight={highlight} index={computedDepths[index]} />
            )
          })}
        </Stack>
      )
    }

    function computeDepths(highlights: λHighlight[]): number[] {
      const depths: number[] = [];

      for (let i = 0; i < highlights.length; i++) {
        const { time_range: [startA, endA] } = highlights[i];

        const usedDepths = new Set<number>();

        for (let j = 0; j < i; j++) {
          const { time_range: [startB, endB] } = highlights[j];
          const overlaps =
            !(endA <= startB || startA >= endB);

          if (overlaps) {
            usedDepths.add(depths[j]);
          }
        }

        let d = 0;
        while (usedDepths.has(d)) d++;
        depths.push(d);
      }

      return depths;
    }
  }

  export namespace Component {
    export interface Props extends Stack.Props {
      highlight: λHighlight
      index?: number
    }
  }

  export function Component({ highlight, style, className, index = 0, ...props }: Highlights.Component.Props) {
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

    // @ts-ignore
    window.highlights.push([left, width, index, highlight.color]);

    return (
      <Stack pos='absolute' className={cn(className, s.highlight)} style={{ ...style, left, width, '--variant': `var(--${highlight.color}-800)`, '--index': index }} jc='flex-end' ai='flex-start' {...props}>
        <Badge variant={highlight.color as Badge.Variant} value={highlight.name || 'Highlight'} icon={Glyph.List.get(highlight.glyph_id) || Default.Icon.HIGHLIGHT} />
      </Stack>
    )
  }
}