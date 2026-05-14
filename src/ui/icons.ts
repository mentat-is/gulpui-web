import { Icon as ImpactiumIcon } from '@impactium/icons'

export const icons = ImpactiumIcon.icons

export const ICON_VARIANT_COLORS = {
    default: 'currentColor',
    white: '#e8e8e8',
    dimmed: '#a1a1a1',
    black: '#0d0d0d',
} as const

export type IconName = ImpactiumIcon.Name

export type IconComponent = (typeof icons)[IconName]

export type IconProps = ImpactiumIcon.Props

export type IconSize = ImpactiumIcon.Size

export const getIcon = (name: IconName): IconComponent => icons[name]