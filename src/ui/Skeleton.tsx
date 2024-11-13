import s from './styles/Skeleton.module.css'
import { cva, VariantProps } from "class-variance-authority";

const { avatar, short, badge, button } = s;

const skeletonVariants = cva(s.skeleton, {
  variants: {
    variant: {
      default: s.default,
      avatar,
      badge,
      button
    },
    size: {
      default: s.defaultSize,
      short
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof skeletonVariants> & {
  height?: number | string;
  width?: number | string
};

const Skeleton = ({
  className,
  variant,
  size,
  height = '',
  width = '',
  style = {},
  ...props
}: SkeletonProps) => {
  return (
    <div
      style={{...style, height, width }}
      className={skeletonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Skeleton }
