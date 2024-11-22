import React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { cn } from "./utils"
import s from './styles/ContextMenu.module.css';
import { Icon } from "@impactium/icons";
const ContextMenu = ContextMenuPrimitive.Root

const ContextMenuTrigger = ContextMenuPrimitive.Trigger

const ContextMenuGroup = ContextMenuPrimitive.Group

const ContextMenuPortal = ContextMenuPrimitive.Portal

const ContextMenuSub = ContextMenuPrimitive.Sub

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

const contextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean
    img?: Icon.Name
  }
>(({ className, inset, img, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      s.subTrigger,
      inset && s.subTriggerInset,
      className
    )}
    {...props}
  >
    {img && <Icon name={img} className={s.icon} />}
    {children}
    <Icon name='ChevronRight' variant='white' size={14} className={s.subTriggerIcon} />
  </ContextMenuPrimitive.SubTrigger>
))
contextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName

const contextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      s.subContent,
      className
    )}
    {...props}
  />
))
contextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName

const contextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        s.content,
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
))
contextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

const contextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean
    img?: Icon.Name
  }
>(({ className, img, children, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      s.item,
      inset && s.itemInset,
      className
    )}
    {...props}
  >{img && <Icon name={img} className={s.icon} />}{children}</ContextMenuPrimitive.Item>
))
contextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

const contextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      s.checkboxItem,
      className
    )}
    checked={checked}
    {...props}
  >
    <span className={s.checkboxItemIndicator}>
      <ContextMenuPrimitive.ItemIndicator>
        <Icon name='Check' className={s.checkboxItemIcon} />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
))
contextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName

const contextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      s.radioItem,
      className
    )}
    {...props}
  >
    <span className={s.radioItemIndicator}>
      <ContextMenuPrimitive.ItemIndicator>
        <Icon name='Circle' className={s.radioItemIcon} />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
))
contextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName

const contextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      s.label,
      inset && s.labelInset,
      className
    )}
    {...props}
  />
))
contextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName

const contextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn(s.separator, className)}
    {...props}
  />
))
contextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName

const contextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        s.shortcut,
        className
      )}
      {...props}
    />
  )
}
contextMenuShortcut.displayName = "ContextMenuShortcut"

export {
  ContextMenu,
  ContextMenuTrigger,
  contextMenuContent as ContextMenuContent,
  contextMenuItem as ContextMenuItem,
  contextMenuCheckboxItem as ContextMenuCheckboxItem,
  contextMenuRadioItem as ContextMenuRadioItem,
  contextMenuLabel as ContextMenuLabel,
  contextMenuSeparator as ContextMenuSeparator,
  contextMenuShortcut as ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  contextMenuSubContent as ContextMenuSubContent,
  contextMenuSubTrigger as ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
