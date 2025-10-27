import { ChangeEvent, CSSProperties, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Icon } from '@impactium/icons';
import { Popover } from '@/ui/Popover';
import { cn } from '@impactium/utils';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Stack } from '@/ui/Stack';
import { UUID } from 'crypto';

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
    const [search, setSearch] = useState<string>('');
    const parentRef = useRef<HTMLDivElement | null>(null);
    
    const entities = useMemo(() => {
      return Glyph.Entries.filter(e => e[1].toLowerCase().includes(search.toLowerCase()));
    }, [search]);

    const handleGlyphSearchInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
    }, [setSearch]);

    const SearchInput = useMemo(() => {
      return <Input variant='highlighted' icon='MagnifyingGlass' placeholder='Glyph name or association' value={search} onChange={handleGlyphSearchInput} name="glyph-search"/>
    }, [search, handleGlyphSearchInput]);

    
    const rowVirtualizer = useVirtualizer({
      count: entities.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 40,
      overscan: 10,
    });

    return (
      <Popover.Root
        onOpenChange={(open) => {
          if (open) {
            setTimeout(() => {
              rowVirtualizer.measure();
            }, 0);
          }
        }}
      >
        <Popover.Trigger asChild>
          {asButton ? <Button className={rootClassName} icon={icon ? Glyph.List.get(icon) : 'SquareDashed'} variant='secondary' /> : <Input variant='highlighted' className={cn(s.input, className)} style={style} icon={icon ? Glyph.List.get(icon) : 'SquareDashed'} value={icon ? Glyph.List.get(icon) : 'Choose icon'} label={label} />}
        </Popover.Trigger>
        <Popover.Content align='end' forceMount>
          <Stack dir='column' className={s.wrapper} ai='stretch'>
            {SearchInput}
            <div ref={parentRef} className={s.list} style={{ width: '300px' }}>
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: 'relative',
                  width: '100%',
                }}
              >
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const [k, n] = entities[virtualRow.index];
                  if (!k) return null;

                  return (
                    <div
                      key={n}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <Button
                        variant={k === icon ? 'glass' : 'tertiary'}
                        icon={n}
                        onClick={() => setIcon(k)}
                        className={s.iconButton}
                      >
                        {n}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Stack>
        </Popover.Content>
      </Popover.Root>
    )
  }
}
