/* eslint-disable prettier/prettier */
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@impactium/utils'
import s from './styles/Badge.module.css'
import { Icon } from '@impactium/icons'
import { Stack } from '@impactium/components'

const badgeVariants = cva(s.badge, {
  variants: {
    variant: {
      default: s.default,
      secondary: s.secondary,
      destructive: s.destructive,
      warning: s.warning,
      outline: s.outline,
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export namespace Badge {
  export interface Props
    extends Stack.Props,
    VariantProps<typeof badgeVariants> {
    icon?: Icon.Name
  }
}

function Badge({ className, variant, value, icon, ...props }: Badge.Props) {
  return (
    <Stack className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {value || props.children}
    </Stack>
  )
}

export { Badge, badgeVariants }
