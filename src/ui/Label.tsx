import { cn } from "@impactium/utils";
import { HTMLAttributes } from "react";
import s from './styles/Label.module.css'

export namespace Label {
  export interface Props extends HTMLAttributes<HTMLLabelElement> {
    value?: string
  }
}

export function Label({ value, className, ...props }: Label.Props) {
  if (!value) {
    return null;
  }

  return (
    <label className={cn(s.label, className)} {...props}>{value}</label>
  )
}