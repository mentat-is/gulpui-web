'use client'
import React, { forwardRef } from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import s from './styles/Separator.module.css';
import { cn } from '@impactium/utils';
type SeparatorPrimitiveProps = React.ElementRef<typeof SeparatorPrimitive.Root>;
type ComponentPropsWithoutRef = React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & {
  color?: string;
}

const Separator = forwardRef<SeparatorPrimitiveProps, ComponentPropsWithoutRef>(({ color = 'var(--accent-3)', className, orientation = 'horizontal', style, decorative = true, ...props }, ref) => (
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
        ...style,
        background: color
      }}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
