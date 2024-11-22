import * as React from "react"
import { DayPicker } from "react-day-picker"
import styles from './styles/Calendar.module.css'

import { cn } from "./utils"
import { buttonVariants } from "./Button"
import { Icon } from "@impactium/icons"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(styles.p3, className)}
      classNames={{
        months: cn(styles.flexColSmFlexRow, styles.spaceY4, styles.smSpaceX4SmSpaceY0),
        month: styles.spaceY4,
        caption: styles.caption,
        caption_label: styles.captionLabel,
        nav: styles.nav,
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          styles.navButton
        ),
        nav_button_previous: styles.navButtonPrevious,
        nav_button_next: styles.navButtonNext,
        table: styles.table,
        head_row: styles.headRow,
        head_cell: styles.headCell,
        row: styles.row,
        cell: cn(styles.cell, {
          [styles.hasDayRangeEnd]: true,
          [styles.hasDayOutside]: true,
          [styles.hasSelected]: true,
        }),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          styles.day
        ),
        day_range_end: styles.dayRangeEnd,
        day_selected: styles.daySelected,
        day_today: styles.dayToday,
        day_outside: styles.dayOutside,
        day_disabled: styles.dayDisabled,
        day_range_middle: styles.dayRangeMiddle,
        day_hidden: styles.dayHidden,
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <Icon name='ArrowLeft' {...props} />,
        IconRight: ({ ...props }) => <Icon name='ArrowRight' {...props} />,
      }}
      {...props}
     />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
