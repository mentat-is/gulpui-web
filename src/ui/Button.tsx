import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import s from "./styles/Button.module.css";
import { Loading } from "./Loading";

const buttonVariants = cva(s.button, {
  variants: {
    variant: {
      default: s.default,
      destructive: s.destructive,
      outline: s.outline,
      secondary: s.secondary,
      ghost: s.ghost,
      link: s.link,
      disabled: s.disabled,
      hardline: s.hardline
    },
    size: {
      default: s.defaultSize,
      sm: s.sm,
      lg: s.lg,
      icon: s.icon,
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  img?: string;
  revert?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, img, revert, loading, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const paddingClass = img ? (props.children ? (revert ? s.revert : s.withImage) : s.onlyImage) : null;

    const children = !asChild && props.children;

    if (!size && img && !children) {
      size = 'icon'
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), paddingClass, loading && s.loading)}
        ref={ref}
        {...props}>
        {asChild ? props.children : (loading
          ? <Loading size={size} />
          : <React.Fragment>
              {img && <img src={img} />}
              {children}
            </React.Fragment>
        )}
      </Comp>
    )
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
