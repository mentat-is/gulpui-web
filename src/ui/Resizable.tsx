import * as ResizablePrimitive from "react-resizable-panels"
import s from './styles/Resizable.module.css'
import { cn } from './utils'

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      s.container,
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(s.label, className)}
    {...props}
  >
    {withHandle && (
      <div className={s.drag_wrapper}>
        <img alt='' src='https://cdn.impactium.fun/ui/drag/horizontal.svg' className={s.drag} />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
