import * as React from "react";

export interface StackProps extends React.ButtonHTMLAttributes<HTMLDivElement> {
  gap?: React.CSSProperties['gap'];
  dir?: React.CSSProperties['flexDirection'];
  pos?: React.CSSProperties['position'];
  jc?: React.CSSProperties['justifyContent'];
  ai?: React.CSSProperties['alignItems'];
  flex?: React.CSSProperties['flex'] | boolean;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({
    className,
    flex = 'inherit',
    gap = 6,
    dir: flexDirection = 'row',
    pos: position = 'unset',
    style,
    jc: justifyContent = 'normal',
    ai: alignItems = 'normal',
    ...props
  }, ref) => {
    return (
      <div style={{
        ...style,
        display: 'flex',
        gap,
        flex: typeof flex === 'boolean' ? Number(flex) : flex,
        flexDirection,
        justifyContent,
        alignItems,
        position,
      }} ref={ref} {...props} />
    )
  }
)

Stack.displayName = 'Stack';

export { Stack };