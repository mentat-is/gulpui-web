import React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import s from './styles/Popover.module.css'
import { cn } from '@impactium/utils'

export namespace Popover {
  export const Root = PopoverPrimitive.Root

  export const Trigger = PopoverPrimitive.Trigger

  export const Content = React.forwardRef<
    React.ComponentRef<typeof PopoverPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
  >(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(s.popover, className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  ))
  Content.displayName = PopoverPrimitive.Content.displayName
}
