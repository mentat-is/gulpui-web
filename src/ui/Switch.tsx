import React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch'
import s from './styles/Switch.module.css';
import { cn } from './utils';

export type { SwitchProps } from '@radix-ui/react-switch';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      s.switch,
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={s.thumb}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
