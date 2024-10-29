import { GlyphMap } from "@/dto/Glyph.dto";
import { Button } from "@/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";
import { λIcon } from "@/ui/utils";
import s from './styles/Glyphs.popover.module.css';
import { toast } from "sonner";
import { Fragment, useState } from "react";

interface GlyphPopoverProps {
  icon: number,
  setIcon: React.Dispatch<React.SetStateAction<number>>
}

export function GlyphsPopover({ icon, setIcon }: GlyphPopoverProps) {
  const [open, setOpen] = useState(false);
  const uploadGlyph = () => {
    toast.info('This is paid feature', {
      description: 'Leave 5 bucks in the disk drive of your PC',
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={s.trigger}>
          <Button variant='ghost'>{icon !== -1 ? GlyphMap[icon] || 'ScanSearch' : 'Choose glyph'}</Button>
          <Button variant='glass' img={icon !== -1 ? GlyphMap[icon] : 'ScanSearch'} />
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className={s.map}>
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