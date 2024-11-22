import * as ResizablePrimitive from "react-resizable-panels"
import s from './styles/Resizable.module.css'
import { cn } from './utils'
import { Icon } from "@impactium/icons"

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
        <Icon name='GripHorizontal' className={s.drag} />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
