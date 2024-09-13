import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import styles from "./styles/Badge.module.css";

const badgeVariants = cva(styles.badge, {
  variants: {
    variant: {
      default: styles.default,
      secondary: styles.secondary,
      destructive: styles.destructive,
      outline: styles.outline,
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
      value: React.ReactNode;
    }

function Badge({ className, variant, value, ...props }: BadgeProps) {
  props.children = value || props.children;

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
