import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@impactium/utils';
import s from './styles/Button.module.css';
import { Icon } from '@impactium/icons';
import { Spinner } from './Spinner';

const buttonVariants = cva(s.button, {
  variants: {
    variant: {
      default: s.default,
      secondary: s.secondary,
      tertiary: s.tertiary,
      glass: s.glass,
      destructive: s.destructive,
      disabled: s.disabled
    },
    size: {
      default: s.defaultSize,
      sm: s.sm,
      lg: s.lg,
      icon: s.icon,
    },
    disabled: {
      true: s.disabled
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export namespace Button {
  export interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    img?: Icon.Name;
    revert?: boolean;
    loading?: boolean;
    placeholder?: string;
    rounded?: boolean;
  }

  export type Variant = Props['variant'];

  export type Size = Props['size'];
}

const Button = React.forwardRef<HTMLButtonElement, Button.Props>(
  ({ className, variant, rounded, size, img, revert, disabled, loading, asChild = false, placeholder, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const paddingClass = img ? (props.children ? (revert ? s.revert : s.withImage) : s.onlyImage) : null;

    const children = !asChild && props.children;

    if (!size && img && !children) {
      size = 'icon'
    }

    const color = convertButtonVariantToSpinnerColor(variant);
    const iconSize = convertButtonVariantToIconSize(size);

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className, disabled }), paddingClass, loading && s.loading, rounded && s.rounded)}
        ref={ref}
        {...props}>
        {asChild ? props.children : (loading
          ? (
            <>
              <Spinner color={color} size={iconSize + 4} />
              {size !== 'icon' ? placeholder ?? 'Loading...' : null}
            </>
          )
          : <>
            {img && <Icon name={img} size={iconSize} />}
            {children}
          </>
        )}
      </Comp>
    )
  }
);
Button.displayName = 'Button';

const spinner_colors = {
  default: 'black',
  secondary: 'white',
  tertiary: 'white',
  glass: 'var(--gray-700)',
  destructive: 'white',
  disabled: 'var(--gray-700)',
  link: 'white',
};
const convertButtonVariantToSpinnerColor = (variant: Button.Variant): string => spinner_colors[variant || 'default'];

const icon_sizes = { default: 16, sm: 12, lg: 20, icon: 16 };
const convertButtonVariantToIconSize = (size: Button.Size): NonNullable<Icon.Size> => icon_sizes[size || 'default'];


export { Button, buttonVariants };
