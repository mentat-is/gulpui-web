import { Glyph, GlyphMap } from "@/dto/Glyph.dto";
import { Button } from "@/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";
import { λIcon } from "@/ui/utils";
import s from './styles/Glyphs.popover.module.css';
import { toast } from "sonner";

interface GlyphPopoverProps {
  icon: number,
  setIcon: React.Dispatch<React.SetStateAction<number>>
}

export function GlyphsPopover({ icon, setIcon }: GlyphPopoverProps) {
  const uploadGlyph = () => {
    toast.info('This is paid feature', {
      description: 'Leave 5 bucks in the disk drive of your PC',
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='glass' img={(GlyphMap[icon] || 'ScanSearch') as λIcon}>{icon !== -1 ? `Selected glyph: ${GlyphMap[icon]}` : 'Choose glyph'}</Button>
      </PopoverTrigger>
      <PopoverContent className={s.map}>
        {GlyphMap.map((glyph, index) => (
          <Button
            key={glyph}
            variant={icon === index ? 'default' : 'outline'}
            img={glyph as λIcon}
            onClick={() => setIcon(index)}
          />
        ))}
        <Button className={s.upload} variant='hardline' img='Plus' onClick={uploadGlyph}>Upload</Button>
      </PopoverContent>
    </Popover>
  );
}