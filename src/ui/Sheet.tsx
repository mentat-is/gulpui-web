"use client"
import s from './styles/Sheet.module.css'
import React, { ComponentPropsWithoutRef, ElementRef } from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./utils";
import { Button } from './Button'
 
const Sheet = SheetPrimitive.Root
 
const SheetTrigger = SheetPrimitive.Trigger
 
const SheetClose = SheetPrimitive.Close
 
const SheetPortal = SheetPrimitive.Portal
 
const SheetOverlay = React.forwardRef<
  ElementRef<typeof SheetPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      s.overlay,
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName
 
const sheetVariants = cva(
  s.sheet,
  {
    variants: {
      side: {
        top: s.top,
        bottom: s.bottom,
        left: s.left,
        right: s.right,
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)
 
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
      action: (...args: any[]) => any;
    }
 
const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, action, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <Button variant='ghost' asChild size='icon' onClick={action}>
        <SheetPrimitive.Close className={s.close}>
          <img src='https://cdn.impactium.fun/ui/close/md.svg' alt='' />
          <span className={s.sr}>Close</span>
        </SheetPrimitive.Close>
      </Button>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName
 
const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      s.header,
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"
 
const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      s.footer,
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"
 
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(s.title, className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName
 
const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn(s.description, className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName
 
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
