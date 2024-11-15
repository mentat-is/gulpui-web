import s from './styles/Skeleton.module.css'
import { cva, VariantProps } from 'class-variance-authority';

const { avatar, short, badge, button, long, full, low, high } = s;

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
      full
    },
    height: {
      default: s.defaultHeight,
      low,
      high
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

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & Omit<VariantProps<typeof skeletonVariants>, 'height' | 'width'> & {
  height?: VariantProps<typeof skeletonVariants>['height'] | number | `${number}` | `${number}%`;
  width?: VariantProps<typeof skeletonVariants>['width'] | number | `${number}` | `${number}%`;
};

const Skeleton = ({
  className,
  variant,
  height,
  width,
  border,
  style = {},
  ...props
}: SkeletonProps) => {
  return (
    <div
      style={{
        ...style,
        height: Number.isNaN(Number(height)) && String(height).endsWith('%')
          ? undefined!
          : height!,
        width: Number.isNaN(Number(width)) && String(height).endsWith('%')
        ? undefined!
        : width!
      }}
      className={skeletonVariants({
        variant,
        width: width as VariantProps<typeof skeletonVariants>['width'],
        height: height as VariantProps<typeof skeletonVariants>['height'],
        border,
        className
      })}
      {...props}
    />
  )
}

export { Skeleton }
