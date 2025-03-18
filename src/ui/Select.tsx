import s from './styles/Select.module.css'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@impactium/utils'
import { Icon as ImpactiumIcon } from '@impactium/icons'
import { forwardRef } from 'react'
import { type ElementRef, ComponentPropsWithoutRef } from 'react'

export namespace Select {
  export const Root = SelectPrimitive.Root
  export const Group = SelectPrimitive.Group
  export const Value = SelectPrimitive.Value
  export const Trigger = forwardRef<
    ElementRef<typeof SelectPrimitive.Trigger>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
  >(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger ref={ref} className={cn(s.trigger, className)} {...props}>
      {children}
      <Select.Icon style={{ marginLeft: 'auto' }} name='ChevronDown' />
    </SelectPrimitive.Trigger>
  ))
  export const Icon = ({ name, className, ...props }: ImpactiumIcon.Props) => (
    <SelectPrimitive.Icon asChild>
      <ImpactiumIcon name={name} className={cn(s.icon, className)} {...props} />
    </SelectPrimitive.Icon>
  )
  export namespace ScrollButton {
    export const Up = forwardRef<
      ElementRef<typeof SelectPrimitive.ScrollUpButton>,
      ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
    >(({ className, ...props }, ref) => (
      <SelectPrimitive.ScrollUpButton
        ref={ref}
        className={cn(s.scroll, s.up, className)}
        {...props}
      >
        <Select.Icon name='ChevronUp' />
      </SelectPrimitive.ScrollUpButton>
    ))
    export const Down = forwardRef<
      ElementRef<typeof SelectPrimitive.ScrollDownButton>,
      ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
    >(({ className, ...props }, ref) => (
      <SelectPrimitive.ScrollDownButton ref={ref} className={cn(s.scroll, s.down, className)} {...props}>
        <Select.Icon name='ChevronDown' />
      </SelectPrimitive.ScrollDownButton>
    ))
  }
  export const Content = forwardRef<
    ElementRef<typeof SelectPrimitive.Content>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
  >(({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(s.content, position === 'popper' && s.popper, className)}
        position={position}
        {...props}
      >
        <Select.ScrollButton.Up />
        <SelectPrimitive.Viewport className={cn(s.primitive, position === 'popper' && s.podder)}>
          {children}
        </SelectPrimitive.Viewport>
        <Select.ScrollButton.Down />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ))
  export const Label = forwardRef<
    ElementRef<typeof SelectPrimitive.Label>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
  >(({ className, ...props }, ref) => (
    <SelectPrimitive.Label ref={ref} className={cn(s.label, className)} {...props} />
  ))
  export const Item = forwardRef<
    ElementRef<typeof SelectPrimitive.Item>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
  >(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item ref={ref} className={cn(s.item, className)} {...props}>
      <SelectPrimitive.ItemIndicator>
        <Select.Icon name='Check' />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  ))
  export const Separator = forwardRef<
    ElementRef<typeof SelectPrimitive.Separator>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
  >(({ className, ...props }, ref) => (
    <SelectPrimitive.Separator ref={ref} className={cn(s.separator, className)} {...props} />
  ))
}
