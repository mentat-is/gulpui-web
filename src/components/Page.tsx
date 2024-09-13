import { ReactElement } from "react"
import s from './Page.module.css'
import { useOptionStyling } from "../decorator/useOptionStyling"
import { ClassName, cn } from "../ui/utils"

type Direction = 'row' | 'column'

interface IPage {
  children: any;
  options?: {
    center?: boolean;
    direction?: Direction
  },
  className: ClassName
}

export function Page({ children, options, className }: IPage): ReactElement<any, any> {
  return (
    <div className={cn(s.page, useOptionStyling(options, s), className)}>
      {children}
    </div>
  )
}
