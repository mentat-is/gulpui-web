import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Popover } from '@/ui/Popover';
import { Icon } from '@impactium/icons';
import { cn } from '@impactium/utils';
import { UUID } from 'crypto';
import { CSSProperties, useMemo } from 'react';
import { toast } from 'sonner';
import s from './styles/Glyph.module.css';

export namespace Glyph {
  const _ = Symbol('Glyph')
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type {
    id: Glyph.Id;
    img: string;
    name: Icon.Name;
  }

  export interface Props extends Omit<Icon.Props, 'name'> {
    glyph: Glyph.Id
  }

  export const Raw = (() => Object.keys(Icon.icons))();

  export const List: Map<Glyph.Id, Icon.Name> = new Map()

  export const Entries: Array<[Glyph.Id | null | undefined, Icon.Name]> = [];

  export const getIdByName = (name: Icon.Name): Glyph.Id => Glyph.List.entries().find(([_, n]) => name === n)?.[0]!;

  export namespace Chooser {
    export interface Props {
      className?: string;
      rootClassName?: string;
      label?: string
      style?: CSSProperties;
      asButton?: boolean;
      icon: Glyph.Id | null;
      setIcon: React.Dispatch<React.SetStateAction<Glyph.Id | null>>;
    }
  }

  export const Chooser = ({ style, className, rootClassName, label, icon, setIcon, asButton }: Chooser.Props) => {
    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          {asButton ? <Button className={rootClassName} img={icon ? Glyph.List.get(icon) : 'SquareDashed'} variant='secondary' /> : <Input variant='highlighted' className={cn(s.input, className)} style={style} icon={icon ? Glyph.List.get(icon) : 'SquareDashed'} value={icon ? Glyph.List.get(icon) : 'Choose icon'} label={label} />}
        </Popover.Trigger>
        <Popover.Content align='end' className={s.map}>
          {Glyph.Entries.map(([k, n]) =>
            k ? (
              <Button
                key={n}
                variant={k === icon ? 'glass' : 'tertiary'}
                img={n}
                onClick={() => setIcon(k)}
              />
            ) : null,
          )}
        </Popover.Content>
      </Popover.Root>
    )
  }
}
