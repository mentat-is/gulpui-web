import React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from './utils'
import s from './styles/Progress.module.css';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      s.root,
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={s.bar}
      style={{ width: `${Math.round(value || 0)}%` }}
    >
      <span className={s.label}>{value}%</span>
    </ProgressPrimitive.Indicator>
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
