import { Icon as ImpactiumIcon } from '@impactium/icons'
import { ComponentProps } from 'react'

const VARIANT_COLORS = {
    default: 'currentColor',
    white: '#e8e8e8',
    dimmed: '#a1a1a1',
    black: '#0d0d0d',
} as const

export function Icon({
    name,
    variant = 'default',
    color,
    ...props
}: Icon.Props) {
    const resolvedColor = color ?? VARIANT_COLORS[variant]

    return <ImpactiumIcon name={name} color={resolvedColor} {...props} />
}

export namespace Icon {
    export type Name = ImpactiumIcon.Name

    export type Size = ImpactiumIcon.Size

    export interface Props extends Omit<ComponentProps<typeof ImpactiumIcon>, 'name' | 'variant' | 'color'> {
        name: Name
        color?: string
        variant?: keyof typeof VARIANT_COLORS
    }

    export const icons = ImpactiumIcon.icons
}