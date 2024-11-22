'use client'
import React, { forwardRef } from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import s from './styles/Separator.module.css';
import { cn } from './utils'

type SeparatorPrimitiveProps = React.ElementRef<typeof SeparatorPrimitive.Root>;
type ComponentPropsWithoutRef = React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & {
  color?: string;
}

const Separator = forwardRef<SeparatorPrimitiveProps, ComponentPropsWithoutRef>(({ color = 'var(--accent-3)', className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        s.separator,
        s[orientation],
        className
      )}
      style={{
        background: color
      }}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
