import * as React from "react";

export interface StackProps extends React.ButtonHTMLAttributes<HTMLDivElement> {
  gap?: React.CSSProperties['gap'];
  dir?: React.CSSProperties['flexDirection'];
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, gap = 6, dir: flexDirection = 'row', disabled, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', gap, flexDirection }} ref={ref} {...props} />
    )
  }
)

Stack.displayName = 'Stack';

export { Stack };