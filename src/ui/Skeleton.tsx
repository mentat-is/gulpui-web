import React from 'react';
import s from './styles/Skeleton.module.css'
import { cva, VariantProps } from 'class-variance-authority';

const { avatar, short, badge, button, long, low, high } = s;

const skeletonVariants = cva(s.skeleton, {
  variants: {
    variant: {
      default: s.default,
      avatar,
      badge,
      button
    },
    width: {
      default: s.defaultWidth,
      short,
      long,
      full: s.w_full
    },
    height: {
      default: s.defaultHeight,
      low,
      high,
      full: s.h_full
    },
    border: {
      default: s.defaultBorder,
      s: s.border_s,
      m: s.border_m,
      l: s.border_l,
      r: s.border_r
    }
  },
  defaultVariants: {
    variant: 'default',
    width: 'default',
    height: 'default',
    border: 'default'
  },
});

export type ChadNumber = number | `${number}` | `${number}%`;

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & Omit<VariantProps<typeof skeletonVariants>, 'height' | 'width'> & {
  enable?: boolean;
  height?: VariantProps<typeof skeletonVariants>['height'] | ChadNumber;
  width?: VariantProps<typeof skeletonVariants>['width'] | ChadNumber;
};

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(({
    className,
    variant,
    height,
    width,
    border,
    style = {},
    enable,
    ...props
  }, ref) => enable || !props.children ? (  
    <div
      ref={ref}
      style={{
        ...style,
        height: height as ChadNumber,
        width: width as ChadNumber,
        animationDelay: `-${Math.random()}s`,
      }}
      className={skeletonVariants({
        variant,
        width: enable && props.children ? null : width as VariantProps<typeof skeletonVariants>['width'],
        height: enable && props.children ? null : height as VariantProps<typeof skeletonVariants>['height'],
        border,
        className
      })}
      {...props} />
  ) : props.children as never
);
Skeleton.displayName = "Skeleton";

export { Skeleton, skeletonVariants };
