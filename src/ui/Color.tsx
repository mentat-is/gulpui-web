import { createContext, HTMLAttributes, useContext, useState } from 'react'
import { Popover } from './Popover'
import { arrayToLinearGradientCSS } from './utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'
import s from './styles/Color.module.css'
import { cn } from '@impactium/utils'
import { Button } from './Button'
import { Stack } from './Stack'
import { Input } from './Input'
import { Color } from '@/entities/Color'

interface ColorProps extends HTMLAttributes<HTMLDivElement> {
  images?: string[]
  gradients?: Record<string, string[]>
  solids?: number[]
  color?: string
  setColor?: React.Dispatch<React.SetStateAction<string>>
}

interface ColorPickerContext {
  color: string
  setColor: React.Dispatch<React.SetStateAction<string>>
}

const ColorContext =
  createContext<ColorPickerContext | undefined>(undefined) ||
  (() => {
    throw new Error(
      'ColorPickerTrigger and ColorPickerPopover must be inside <ColorPicker> element.',
    )
  })()

export const useColor = (): ColorPickerContext =>
  useContext(ColorContext) as ColorPickerContext

type ColorPickerProps =
  | Button.Props
  | ((Button.Props & ColorPickerContext) & {
    default?: string
  })

export function ColorPicker(props: ColorPickerProps) {
  const [_color, _setColor] = useState<string>('#ffa647')
  const context: ColorPickerContext = {
    color: 'color' in props ? props.color! : _color,
    setColor: 'setColor' in props ? props.setColor : _setColor,
  }

  return (
    <ColorContext.Provider value={context}>
      <Popover.Root>{props.children}</Popover.Root>
    </ColorContext.Provider>
  )
}

type ColorPickerTriggerProps = HTMLAttributes<HTMLButtonElement>

export function ColorPickerTrigger({
  className,
  ...props
}: ColorPickerTriggerProps) {
  const { color } = useColor()

  return (
    <Popover.Trigger asChild>
      <Stack pos='relative' className={cn(s.picker, s.trigger)}>
        <Input
          className={s.select}
          disabled
          variant="color"
          value={color}
        />
        <Input
          className={s.manual}
          variant='highlighted'
          icon='Dot'
          id="custom"
          value={color}
        />
      </Stack>
    </Popover.Trigger>
  )
}

export type Tab = 'solid' | 'gradient'

export function ColorPickerPopover({
  color: _color,
  setColor: _setColor,
  gradients = {},
  solids = Object.values(Color.GEIST),
}: ColorProps) {
  const { color: newColor, setColor: setNewColor } = useColor() || {}

  const color = _color ?? newColor
  const setColor = _setColor ?? setNewColor

  const [tab, setTab] = useState<Tab>(
    Object.keys(gradients).length ? 'gradient' : 'solid',
  )

  return (
    <Popover.Content className={s.popover}>
      <Tabs
        onValueChange={(v) => setTab(v as Tab)}
        defaultValue={tab}
        value={tab}
        className={s.tabs}
      >
        {!!solids.length && !!Object.keys(gradients).length && (
          <TabsList className={s.list}>
            <TabsTrigger className={s.trigger} value="solid">
              Solid
            </TabsTrigger>
            <TabsTrigger className={s.trigger} value="gradient">
              Gradient
            </TabsTrigger>
          </TabsList>
        )}

        {!!solids.length && (
          <TabsContent value="solid" className={s.content}>
            {solids.map((solid) => (
              <div
                key={solid}
                style={{ background: solid }}
                className={s.color}
                onClick={() => setColor(solid.toString())}
              />
            ))}
          </TabsContent>
        )}

        {!!Object.keys(gradients).length && (
          <TabsContent value="gradient" className={s.content}>
            {Object.keys(gradients).map((key) => (
              <div
                key={key}
                style={{ background: arrayToLinearGradientCSS(gradients[key]) }}
                className={s.color}
                onClick={() => setColor(key)}
              />
            ))}
          </TabsContent>
        )}
      </Tabs>

      {tab !== 'gradient' && (
        <Stack pos='relative' className={s.picker}>
          <Input
            className={s.select}
            variant="color"
            value={color}
            onChange={(e) => setColor(e.currentTarget.value)}
          />
          <Input
            className={s.manual}
            variant='highlighted'
            icon='Dot'
            id="custom"
            value={color}
            onChange={(e) => setColor(e.currentTarget.value)}
          />
        </Stack>
      )}
    </Popover.Content>
  )
}
