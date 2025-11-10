import s from './Highlights.module.css';
import { Icon } from '@impactium/icons';
import { useMemo, useRef, useState } from 'react';
import { MinMax, Range } from '@/class/Info';
import { Application } from '@/context/Application.context';
import { Default } from '@/dto/Dataset';
import { Algorhithm } from '@/ui/utils';
import { capitalize, cn } from '@impactium/utils';
import { Select } from '@/ui/Select';
import { Stack } from '@/ui/Stack';
import { Badge } from '@/ui/Badge';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Glyph } from '@/entities/Glyph';
import { Highlight } from '@/entities/Highlight';

export namespace Highlights {
  export namespace Create {
    export namespace Overlay {
      export interface Props extends Stack.Props {

      }
    }

    export function Overlay({ className, ...props }: Highlights.Create.Overlay.Props) {
      const { Info, setHighlightsOverlay, scrollX, scrollY } = Application.use();
      const [icon, setIcon] = useState<Glyph.Id | null>(Glyph.List.keys().next().value!);
      const [name, setName] = useState<string>('');
      const [color, setColor] = useState<NonNullable<Badge.Variant>>('blue');
      const [range, setSelection] = useState<[number, number] | null>(null);
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

        setHighlightsOverlay(null);
      }

      const Hint = useMemo(() => {
        if (range) {
          return (
            <Stack className={s.hint} onMouseDown={e => e.stopPropagation()} pos='relative'>
              <Input className={s.name} variant='highlighted' icon={Glyph.List.get(icon!) ?? Default.Icon.HIGHLIGHT} placeholder='Highlight name' value={name} onChange={e => setName(e.target.value)} />
              <Glyph.Chooser rootClassName={s.icon} asButton icon={icon} setIcon={setIcon} />
              <Select.Root onValueChange={color => setColor(color as NonNullable<Badge.Variant>)}>
                <Select.Trigger value={color} className={s.select}>
                  <Icon name='Status' />
                  <p>{capitalize(color)}</p>
                </Select.Trigger>
                <Select.Content>
                  {['blue', 'gray', 'green', 'pink', 'purple', 'red', 'teal'].map(color => {
                    return (
                      <Select.Item value={color} style={{ color: `var(--${color}-700)`, background: `var(--${color}-200)` }}>
                        <Icon name='Status' />
                        <p>{capitalize(color)}</p>
                      </Select.Item>
                    )
                  })}
                </Select.Content>
              </Select.Root>
              <Button variant='glass' disabled={!name} icon='Check' onMouseDown={submit}>Create</Button>
              <Button className={s.x} variant='secondary' icon='X' onMouseDown={unselect} />
            </Stack>
          )
        }

        return (
          <Stack className={s.hint} onMouseDown={e => e.stopPropagation()} pos='relative'>
            <Icon name='ChartBarBig' />
            <code>Select area highlighted</code>
            <Button className={s.close} variant='secondary' size='sm' icon='Logout' onMouseDown={destroyOverlay}>Exit</Button>
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
            range,
          } as unknown as Highlight.Type} native />
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
        frame?: Partial<MinMax>;
        layoutWidth?: number;
        fixed?: boolean;
      }
    }

    export function Overlay({ frame, fixed, layoutWidth, ...props }: Highlights.List.Overlay.Props) {
      const { app } = Application.use();

      const highlights = useMemo(() => Highlight.Entity.selected(app), [app.target.highlights, app.target.operations]);

      const computedDepths = useMemo(() => computeDepths(highlights), [highlights]);

      return (
        <Stack pos='absolute' className={cn(s.overlay, s.ignore)} {...props}>
          {highlights.map((highlight, index) => {
            return (
              <Highlights.Component fixed={fixed} frame={frame} layoutWidth={layoutWidth} highlight={highlight} index={computedDepths[index]} />
            )
          })}
        </Stack>
      )
    }

    function computeDepths(highlights: Highlight.Type[]): number[] {
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
      highlight: Highlight.Type;
      index?: number;
      native?: boolean;
      frame?: Partial<MinMax>;
      layoutWidth?: number;
      fixed?: boolean;
    }
  }

  export function Component({ highlight, fixed, layoutWidth, frame = {}, style, className, index = 0, native, ...props }: Highlights.Component.Props) {
    const { Info, app, scrollX } = Application.use();

    if (layoutWidth) {
      native = true;
    }

    const range = useMemo((): Range => {
      if ('range' in highlight && Array.isArray(highlight.range)) {
        return highlight.range as Range;
      }

      return highlight.time_range.map(t => Math.round(((t - (frame.min ?? app.timeline.frame.min)) / ((frame.max ?? app.timeline.frame.max) - (frame.min ?? app.timeline.frame.min))) * (layoutWidth ?? Info.width)) - (fixed ? 0 : scrollX)) as Range;
    }, [app.timeline.frame, app.timeline.scale, fixed ? undefined : scrollX, highlight, layoutWidth]);

    const [left, width] = useMemo(() => {
      const left = Math.min(...range);
      const width = Math.max(...range) - left;

      if (!native) {
        Highlights.set(highlight.id, left, width, index, highlight.color);
      }

      return [left, width];
    }, [range]);

    return (
      <Stack pos='absolute' className={cn(className, s.highlight)} style={{ ...style, left, width, '--variant': `var(--${highlight.color}-800)`, '--index': index, background: native ? `hsla(var(--${highlight.color}-800-value), 0.16)` : 'transparent' }} jc='flex-end' ai='flex-start' {...props}>
        <Stack style={{ background: `var(--${highlight.color}-700)` }}>
          <Badge className={s.title} data-type='badge' variant={highlight.color as Badge.Variant} value={highlight.name || 'Highlight'} icon={Glyph.List.get(highlight.glyph_id) || Default.Icon.HIGHLIGHT} />
          <Button tabIndex={-1} size='sm' variant='glass' className={s.deleteButton} icon='Trash2' onClick={() => Info.highlight_delete(highlight.id)} />
        </Stack>
      </Stack>
    )
  }

  export function init() {
    // @ts-ignore
    window.highlights = window.highlights ?? {};
  }

  export function list(): [number, number, number, string][] {
    Highlights.init();
    // @ts-ignore
    return Object.values(window.highlights);
  }

  export function set(id: Highlight.Id, left: number, width: number, index: number, color: string) {
    init();
    // @ts-ignore
    window.highlights[id] = [left, width, index, color];
  }

  export function remove(id: Highlight.Id) {
    // @ts-ignore
    delete window.highlights[id]
  }
}
