import { λGlyph } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { Button, Input } from '@impactium/components'
import s from './styles/Glyph.module.css'
import { cn } from '@impactium/utils'
import { CSSProperties } from 'react'

export function Glyph({ glyph, ...props }: Glyph.Props) {
  const icon = Glyph.List.get(glyph)

  if (icon) {
    return <Icon name={icon} {...props} />
  }

  return <Icon name="Bookmark" {...props} />
}

export namespace Glyph {
  export interface Props extends Omit<Icon.Props, 'name'> {
    glyph: λGlyph['id']
  }

  export const Raw = Object.keys(Icon.icons);

  export const List: Map<λGlyph['id'], Icon.Name> = new Map()

  export namespace Chooser {
    export interface Props {
      className?: string;
      rootClassName?: string;
      style?: CSSProperties;
      asButton?: boolean;
      icon: λGlyph['id'] | null;
      setIcon: React.Dispatch<React.SetStateAction<λGlyph['id'] | null>>;
    }
  }

  export const Chooser = ({ style, className, rootClassName, icon, setIcon, asButton }: Chooser.Props) => {
    const uploadGlyph = () => {
      toast.info('This is paid feature', {
        description: 'Leave 5 bucks in the disk drive of your PC',
      })
    }

    const map: Array<[λGlyph['id'] | null | undefined, Icon.Name]> = Array.from(
      Glyph.List.entries(),
    )

    return (
      <Popover>
        <PopoverTrigger asChild>
          {asButton ? <Button className={rootClassName} img={icon ? Glyph.List.get(icon) : 'SquareDashed'} variant='secondary' /> : <Input variant='highlighted' className={cn(s.input, className)} style={style} img={icon ? Glyph.List.get(icon) : 'SquareDashed'} value={icon ? Glyph.List.get(icon) : 'Choose icon'} />}
        </PopoverTrigger>
        <PopoverContent align="end" className={s.map}>
          {map.map(([k, n]) =>
            k ? (
              <Button
                key={n}
                variant={k === icon ? 'default' : 'outline'}
                img={n}
                onClick={() => setIcon(k)}
              />
            ) : null,
          )}
          <Button
            className={s.upload}
            variant="hardline"
            img="Plus"
            onClick={uploadGlyph}
          >
            Upload
          </Button>
        </PopoverContent>
      </Popover>
    )
  }
}
