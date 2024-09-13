'use client'
import React, { forwardRef } from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import s from './styles/Separator.module.css';
import { cn } from './utils'

type SeparatorPrimitive = React.ElementRef<typeof SeparatorPrimitive.Root>;
type ComponentPropsWithoutRef = React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>

const Separator = forwardRef<SeparatorPrimitive, ComponentPropsWithoutRef>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        s.separator,
        s[orientation],
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
