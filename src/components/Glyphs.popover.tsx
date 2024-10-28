import { Glyph, GlyphMap } from "@/dto/Glyph.dto";
import { Button } from "@/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";
import { λIcon } from "@/ui/utils";
import { useState } from "react";
import s from './styles/Glyphs.popover.module.css';

export function GlyphsPopover() {
  const [selected, setSelected] = useState<number>(-1);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='glass' img={(GlyphMap[selected] || 'ScanSearch') as λIcon}>{selected !== -1 ? `Selected glyph: ${GlyphMap[selected]}` : 'Choose glyph'}</Button>
      </PopoverTrigger>
      <PopoverContent className={s.map}>
        {GlyphMap.map((glyph, index) => (
          <Button
            key={glyph}
            variant={selected === index ? 'default' : 'outline'}
            img={glyph as λIcon}
            onClick={() => setSelected(index)}
          />
        ))}
      </PopoverContent>
    </Popover>
  );
}