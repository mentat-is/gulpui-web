import s from './styles/Checkbox.module.css'
import React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Icon } from '@impactium/icons'
import { cn } from '@impactium/utils'
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(s.root, className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn(s.indicator)}>
      <Icon name="Check" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
