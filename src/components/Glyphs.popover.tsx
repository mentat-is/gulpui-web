import { GlyphMap } from '@/dto/Glyph.dto';
import { Button } from '@impactium/components';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import s from './styles/Glyphs.popover.module.css';
import { toast } from 'sonner';
import { Icon } from '@impactium/icons';
import { λGlyph } from '@/dto/Dataset';

interface GlyphPopoverProps {
  icon: λGlyph['id'] | null,
  setIcon: React.Dispatch<React.SetStateAction<λGlyph['id'] | null>>
}

export function GlyphsPopover({ icon, setIcon }: GlyphPopoverProps) {
  const uploadGlyph = () => {
    toast.info('This is paid feature', {
      description: 'Leave 5 bucks in the disk drive of your PC',
    });
  }

  const map = GlyphMap.entries();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={s.trigger}>
          <Button variant='ghost'>{icon ? GlyphMap.get(icon) : 'Choose icon'}</Button>
          <Button variant='glass' img={icon ? GlyphMap.get(icon) : 'SquareDashed'} />
        </div>
      </PopoverTrigger>
      <PopoverContent align='end' className={s.map}>
        {/* @ts-ignore */}
        {map.map(([k, n]) => {
          return <Button
            key={n}
            variant={k === icon ? 'default' : 'outline'}
            img={n}
            onClick={() => setIcon(k)}
          />
        })}
        <Button className={s.upload} variant='hardline' img='Plus' onClick={uploadGlyph}>Upload</Button>
      </PopoverContent>
    </Popover>
  );
}