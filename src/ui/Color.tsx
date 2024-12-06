import { createContext, HTMLAttributes, useContext, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Button } from './Button';
import { arrayToLinearGradientCSS, cn, Gradients, GradientsMap } from './utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';
import { Input } from './Input';
import s from './styles/Color.module.css';
import { Children } from '@/dto';
import { capitalize } from 'lodash';
import { Icon } from '@impactium/icons';

interface ColorProps extends HTMLAttributes<HTMLDivElement> {
  images?: string[],
  gradients?: Record<string, string[]>,
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

type ColorPickerProps = Children | (Children & ColorPickerContext) & {
  default?: string;
};

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

interface ColorPickerTriggerProps extends HTMLAttributes<HTMLButtonElement> {

}

export function ColorPickerTrigger({ className, ...props }: ColorPickerTriggerProps) {
  const { color } = useColor();
  return (
    <PopoverTrigger asChild>
      <Button
        variant='outline'
        className={cn(s.button, !color && s.muted, className)}
        {...props}>
          {color ? (
            <div
              className={s.preview}
              style={{ background: Object.keys(GradientsMap).includes(color) ? arrayToLinearGradientCSS(GradientsMap[color as Gradients]) : color}}
            />
          ) : (
            <Icon name='Paintbrush' className={s.icon} />
          )}
          {color ? capitalize(color) : 'Pick a color'}
      </Button>
    </PopoverTrigger>
  );
}

export type Tab = 'solid' | 'gradient'

export function ColorPickerPopover({ gradients = {}, solids = baseSolids}: ColorProps) {
  const { color, setColor } = useColor();
  const [tab, setTab] = useState<Tab>(Object.keys(gradients).length ? 'gradient' : 'solid');

  return (
    <PopoverContent className={s.popover}>
      <Tabs onValueChange={v => setTab(v as Tab)} defaultValue={tab} value={tab} className={s.tabs}>
        {!!solids.length && !!Object.keys(gradients).length && <TabsList className={s.list}>
          <TabsTrigger className={s.trigger} value="solid">
            Solid
          </TabsTrigger>
          <TabsTrigger className={s.trigger} value="gradient">Gradient</TabsTrigger>
        </TabsList>}

        {!!solids.length && <TabsContent value="solid" className={s.content}>
          {solids.map((solid) => (
            <div
              key={solid}
              style={{ background: solid }}
              className={s.color}
              onClick={() => setColor(solid)}
            />
          ))}
        </TabsContent>}

        {!!Object.keys(gradients).length && <TabsContent value="gradient" className={s.content}>
          {Object.keys(gradients).map((key) => 
            <div
              key={key}
              style={{ background: arrayToLinearGradientCSS(gradients[key]) }}
              className={s.color}
              onClick={() => setColor(key)}
            />
          )}
        </TabsContent>}
      </Tabs>

      {tab !== 'gradient' && <div className={s.group}>
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
      </div>}
    </PopoverContent>
  );
}
