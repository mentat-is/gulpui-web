import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import s from './styles/Textarea.module.css'
import { Icon } from '@impactium/icons'
import { cn } from '@impactium/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  asChild?: boolean
  img?: Icon.Name
  revert?: boolean
  loading?: boolean
  fixed?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, asChild = false, fixed, ...props }, ref) => {
    const Comp = asChild ? Slot : 'textarea'

    return (
      <Comp className={cn(s.textarea, className, fixed && s.fixed)} ref={ref} {...props}></Comp>
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
