import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
import s from "./styles/Button.module.css";
import { Loading } from "./Loading";
import { Icon, IconProps } from "./Icon";
import { λIcon } from './utils';
import { Skeleton } from "./Skeleton";

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
      hardline: s.hardline,
      glass: s.glass
    },
    size: {
      default: s.defaultSize,
      sm: s.sm,
      lg: s.lg,
      icon: s.icon,
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  img?: λIcon;
  revert?: boolean;
  loading?: boolean;
  skeleton?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, skeleton, variant, size, img, revert, disabled, loading, asChild = false, ...props }, ref) => {
    let Comp: React.ElementType = asChild ? Slot : "button";

    const paddingClass = img ? (props.children ? (revert ? s.revert : s.withImage) : s.onlyImage) : null;

    const children = !asChild && props.children;

    if (!size && img && !children) {
      size = 'icon'
    }

    return (
      <Skeleton enable={skeleton}>
        <Comp
          className={cn(buttonVariants({ variant: disabled ? 'disabled' : variant, size, className }), paddingClass, loading && s.loading)}
          ref={ref}
          {...props}>
          {asChild ? props.children : (loading
            ? <Loading variant={convertButtonVariantToImageVariant(variant)} size={convertButtonSizeToImageSize(size)} no_text={!children} />
            : <React.Fragment>
                {img && <Icon name={img} size={convertButtonSizeToImageSize(size)} variant={convertButtonVariantToImageVariant(variant)} />}
                {children}
              </React.Fragment>
          )}
        </Comp>
      </Skeleton>
    )
  }
);
Button.displayName = "Button";

const convertButtonVariantToImageVariant = (variant: ButtonProps['variant']): IconProps['variant'] => ({
  default: 'black',
  destructive: 'white',
  outline: 'dimmed',
  secondary: 'white',
  ghost: 'dimmed',
  link: 'white',
  disabled: 'dimmed',
  hardline: 'white',
  glass: 'dimmed'
} as Record<NonNullable<ButtonProps['variant']>, IconProps['variant']>)[variant!] ?? 'black';

const convertButtonSizeToImageSize = (variant: ButtonProps['size']): IconProps['size'] => ({
  sm: 16,
  lg: 24
} as Record<NonNullable<ButtonProps['size']>, IconProps['size']>)[variant!] ?? 20;

export { Button, buttonVariants };
