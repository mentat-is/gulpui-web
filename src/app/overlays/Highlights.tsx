import { Badge, Button, Input, Stack } from "@impactium/components";
import s from './Highlights.module.css';
import { Icon } from "@impactium/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { MinMax, MinMaxBase, Range } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Glyph } from "@/ui/Glyph";
import { λGlyph, λHighlight } from "@/dto/Dataset";
import { Algorhithm } from "@/ui/utils";

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
      const [color, setColor] = useState<string>('');
      const [selection, setSelection] = useState<[number, number] | null>([100, 300]);
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
        if (!selection) {
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

        const range: Range = selection.map(v => algo.timestamp_from_rel_x(v)) as unknown as Range;

        Info.highlight_create({
          name,
          color,
          icon,
          range
        });
      }

      const Hint = useMemo(() => {
        if (selection) {
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
      }, [destroyOverlay, unselect, icon, name, setName, selection, submit])

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
        if (!overlay.current || isSelected || !selection) {
          return;
        }

        const rect = overlay.current.getBoundingClientRect();

        const x = Math.round(event.clientX - rect.x);
        setSelection([selection[0], x]);
      }

      const Selection = () => {
        if (!selection) {
          return null;
        }

        const left = Math.min(...selection);

        const width = Math.max(...selection) - left;

        return (
          <Stack pos='absolute' style={{ left, width }} className={s.highlight} jc='flex-end' ai='flex-start'>
            <Badge variant='blue' value={name || 'Selection'} icon={icon ? Glyph.List.get(icon) || 'Status' : 'Status'} className={s.badge} />
          </Stack>
        )
      }

      return (
        <Stack
          ref={overlay}
          className={s.overlay}
          pos='absolute'
          onMouseDown={createHighlightOverlayMouseDownHandler}
          onMouseMove={createHighlightOverlayMouseMoveHandler}
          onMouseLeave={createHighlightOverlayMouseUpHandler}
          onMouseUp={createHighlightOverlayMouseUpHandler}
          {...props}>
          <Selection />
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

    export function Overlay({ ...props }: Highlights.List.Overlay) {
      return (
        <Stack pos='absolute' {...props}>
          <
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
    return (
      <Stack {...props}>

      </Stack>
    )
  }
}