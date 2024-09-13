import { Paintbrush } from 'lucide-react';
import { createContext, HTMLAttributes, useContext, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Button } from './Button';
import { cn } from './utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';
import { Input } from './Input';
import s from './styles/Color.module.css';
import { Children } from '@/dto';

interface ColorProps extends HTMLAttributes<HTMLDivElement> {
  images?: string[],
  gradients?: string[],
  solids?: string[]
}

const baseSolids = [
  '#E2E2E2',
  '#ff75c3',
  '#ffa647',
  '#ffe83f',
  '#9fff5b',
  '#70e2ff',
  '#cd93ff',
  '#09203f',
];

interface ColorPickerContext {
  color: string;
  setColor: React.Dispatch<React.SetStateAction<string>>;
}

const ColorContext = createContext<ColorPickerContext | undefined>(undefined) || (() => { throw new Error('ColorPickerTrigger and ColorPickerPopover must be inside <ColorPicker> element.') })();

export const useColor = (): ColorPickerContext => useContext(ColorContext)!;

type ColorPickerProps = Children | (Children & ColorPickerContext);

export function ColorPicker(props: ColorPickerProps) {
  const [ _color, _setColor ] = useState<string>('#ffa647');
  const context: ColorPickerContext = {
    color: 'color' in props ? props.color : _color,
    setColor: 'setColor' in props ? props.setColor : _setColor
  };

  return (
    <ColorContext.Provider value={context}>
      <Popover>
        {props.children}
      </Popover>
    </ColorContext.Provider>
  );
};

interface ColorPickerTriggerProps extends HTMLAttributes<HTMLDivElement> {

}

export function ColorPickerTrigger({ className, ...props }: ColorPickerTriggerProps) {
  const { color } = useColor();
  return (
    <PopoverTrigger asChild>
      <Button
        variant='outline'
        className={cn(s.button, !color && s.muted, className)}>
          {color ? (
            <div
              className={s.preview}
              style={{ background: color }}
            ></div>
          ) : (
            <Paintbrush className={s.icon} />
          )}
          {color ? color : 'Pick a color'}
      </Button>
    </PopoverTrigger>
  );
}

export function ColorPickerPopover({ className, gradients = [], images = [], solids = baseSolids}: ColorProps) {
  const { color, setColor } = useColor();

  const defaultTab = useMemo(() => {
    if (color.includes('url')) return 'image';
    if (color.includes('gradient')) return 'gradient';
    return 'solid';
  }, [color]);

  return (
    <PopoverContent className={s.popover}>
      <Tabs defaultValue={defaultTab} className={s.tabs}>
        {!!gradients.length && !!images.length && <TabsList className={s.list}>
          <TabsTrigger className={s.trigger} value="solid">
            Solid
          </TabsTrigger>
          {!!gradients.length && <TabsTrigger className={s.trigger} value="gradient">Gradient</TabsTrigger>}
          {!!images.length && <TabsTrigger className={s.trigger} value="image">Image</TabsTrigger>}
        </TabsList>}

        <TabsContent value="solid" className={s.content}>
          {solids.map((solid) => (
            <div
              key={solid}
              style={{ background: solid }}
              className={s.color}
              onClick={() => setColor(solid)}
            />
          ))}
        </TabsContent>

        {!!gradients.length && <TabsContent value="gradient" className={s.content}>
          <div className={s.gradientsContainer}>
            {gradients.map((gradient) => (
              <div
                key={gradient}
                style={{ background: gradient }}
                className={s.color}
                onClick={() => setColor(gradient)}
              />
            ))}
          </div>
        </TabsContent>}

        {!!images.length && <TabsContent value="image" className={s.content}>
          <div className={s.images}>
            {images.map((image) => (
              <div
                key={image}
                style={{ backgroundImage: image }}
                className={s.image}
                onClick={() => setColor(image)}
              />
            ))}
          </div>
        </TabsContent>}
      </Tabs>

      <div className={s.group}>
        <Input
          variant='color'
          value={color}
          onChange={(e) => setColor(e.currentTarget.value)}
        />
        <Input
          id="custom"
          value={color}
          onChange={(e) => setColor(e.currentTarget.value)}
        />

      </div>
    </PopoverContent>
  );
}
