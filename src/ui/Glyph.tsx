import { λGlyph } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import { μ } from '@/class/Info'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { Button } from '@impactium/components'
import s from './styles/Glyph.module.css'

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

  export const Raw = Object.keys(Icon.icons).slice(0, 50) as Icon.Name[]

  export const List: Map<μ.Glyph, Icon.Name> = new Map()

  export namespace Chooser {
    export interface Props {
      icon: λGlyph['id'] | null
      setIcon: React.Dispatch<React.SetStateAction<λGlyph['id'] | null>>
    }
  }

  export const Chooser = ({ icon, setIcon }: Chooser.Props) => {
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
          <div className={s.trigger}>
            <Button variant="ghost">
              {icon ? Glyph.List.get(icon) : 'Choose icon'}
            </Button>
            <Button
              variant="glass"
              img={icon ? Glyph.List.get(icon) : 'SquareDashed'}
            />
          </div>
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
