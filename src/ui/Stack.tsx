import * as React from "react";

export interface StackProps extends React.ButtonHTMLAttributes<HTMLDivElement> {
  gap?: React.CSSProperties['gap'];
  dir?: React.CSSProperties['flexDirection'];
  pos?: React.CSSProperties['position'];
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, gap = 6, dir: flexDirection = 'row', pos: position, disabled, style, ...props }, ref) => {
    return (
      <div style={{
        ...style,
        display: 'flex',
        gap,
        flexDirection,
        position: position!
      }} ref={ref} {...props} />
    )
  }
)

Stack.displayName = 'Stack';

export { Stack };