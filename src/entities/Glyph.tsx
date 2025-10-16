import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Popover } from '@/ui/Popover';
import { Icon } from '@impactium/icons';
import { cn } from '@impactium/utils';
import { UUID } from 'crypto';
import { ChangeEvent, CSSProperties, useCallback, useMemo, useState } from 'react';
import s from './styles/Glyph.module.css';
import { Stack } from '@/ui/Stack';

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
    const [search, setSearch] = useState<string>('');

    const entities = useMemo(() => {
      return Glyph.Entries.filter(e => e[1].toLowerCase().includes(search.toLowerCase()));
    }, [search]);

    const handleGlyphSearchInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
    }, [setSearch]);

    const SearchInput = useMemo(() => {
      return <Input variant='highlighted' icon='MagnifyingGlass' placeholder='Glyph name or association' value={search} onChange={handleGlyphSearchInput} />
    }, [search, handleGlyphSearchInput]);

    const GlyphList = useMemo(() => {
      return (
        entities.slice(0, 128).map(([k, n]) =>
          k ? (
            <Button
              key={n}
              variant={k === icon ? 'glass' : 'tertiary'}
              icon={n}
              onClick={() => setIcon(k)}
            >{n}</Button>
          ) : null,
        )
      )
    }, [entities])

    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          {asButton ? <Button className={rootClassName} icon={icon ? Glyph.List.get(icon) : 'SquareDashed'} variant='secondary' /> : <Input variant='highlighted' className={cn(s.input, className)} style={style} icon={icon ? Glyph.List.get(icon) : 'SquareDashed'} value={icon ? Glyph.List.get(icon) : 'Choose icon'} label={label} />}
        </Popover.Trigger>
        <Popover.Content align='end'>
          <Stack dir='column' className={s.wrapper} ai='stretch'>
            {SearchInput}
            <Stack className={s.list} ai='stretch' dir='column'>
              {GlyphList}
            </Stack>
          </Stack>
        </Popover.Content>
      </Popover.Root>
    )
  }
}
