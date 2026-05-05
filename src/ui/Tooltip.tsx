import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import s from './styles/Tooltip.module.css'
import { cn } from '@impactium/utils'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (triggerRef.current) {
      setContainer(triggerRef.current.ownerDocument.body);
    }
  }, []);

  return (
    <>
      <div ref={triggerRef} style={{ display: 'none' }} />
      {container && (
        <TooltipPrimitive.Portal container={container}>
          <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(s.tooltip, className)}
            {...props}
          />
        </TooltipPrimitive.Portal>
      )}
    </>
  );
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
