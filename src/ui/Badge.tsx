import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@impactium/utils'
import s from './styles/Badge.module.css'
import { Icon } from '@impactium/icons'
import { HTMLAttributes } from 'react';

const badgeVariants = cva(s.badge, {
  variants: {
    variant: {
      default: s.default,
      gray: s.gray,
      'gray-subtle': s.gray_subtle,
      blue: s.blue,
      'blue-subtle': s.blue_subtle,
      purple: s.purple,
      'purple-subtle': s.purple_subtle,
      amber: s.amber,
      'amber-subtle': s.amber_subtle,
      red: s.red,
      'red-subtle': s.red_subtle,
      pink: s.pink,
      'pink-subtle': s.pink_subtle,
      green: s.green,
      'green-subtle': s.green_subtle,
      teal: s.teal,
      'teal-subtle': s.teal_subtle,
      inverted: s.inverted

    },
    size: {
      lg: s.lg,
      md: s.md,
      sm: s.sm
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'md'
  },
})

export namespace Badge {
  export interface Props
    extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    value?: React.ReactNode;
    disabled?: boolean;
    mono?: boolean;
    icon?: Icon.Name;
    border?: boolean;
    radius?: number | string;
  }

  export type Variant = Badge.Props['variant'];

  export type Size = Badge.Props['size'];
}

export function Badge({ className, mono, variant, size, value, icon, border, disabled, radius: borderRadius = 'var(--round)', ...props }: Badge.Props) {
  return (
    <div className={cn(badgeVariants({ variant, size, className }), border && s.bordered, disabled && s.disabled, mono && s.mono)} style={{ borderRadius }} {...props}>
      {icon ? <Icon name={icon} size={convertButtonVariantToIconSize(size)} /> : null}
      {value || props.children}
    </div>
  )
}

const convertButtonVariantToIconSize = (size: Badge.Size): Icon.Size => ({
  lg: 16,
  md: 14,
  sm: 11,
} as Record<NonNullable<Badge.Size>, Icon.Size>)[size || 'md'];
