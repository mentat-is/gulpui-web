import { CustomGlyphs, GlyphMap } from "@/dto/Glyph.dto";
import { λGlyph } from "@/dto/λGlyph.dto";
import { Icon, IconProps } from "./Icon";

interface GlyphProps extends Omit<IconProps, 'name'> {
  glyph: λGlyph['id'] | null;
}

export function Glyph({ glyph, ...props }: GlyphProps) {
  return glyph && GlyphMap[glyph]
    ? <Icon name={GlyphMap[glyph]} {...props} />
    : glyph && CustomGlyphs[glyph]
      ? <img src={`data:image/jpeg;base64,${CustomGlyphs[glyph]}`} alt='' />
      : <Icon name='Bookmark' {...props} />
}
