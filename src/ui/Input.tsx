import React from "react"
import s from './styles/Input.module.css' 
import { cn } from "./utils"
import { cva, type VariantProps } from "class-variance-authority"; 
import { Skeleton } from "./Skeleton";
import { Icon } from "@impactium/icons";

const inputVariants = cva(s.button, {
  variants: {
    variant: {
      default: s.default,
      color: s.color
    },
    size: {
      default: s.defaultSize,
      sm: s.sm
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof inputVariants> {
  img?: Icon.Name | null;
  revert?: boolean;
  skeleton?: boolean;
  valid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, valid = true, revert, skeleton, variant, type, size, img, ...props }, ref) => {
    const classes = cn(
      inputVariants({ variant, size, className }),
      s.input,
      img || type === 'file' ? s.image : null,
      revert && s.revert,
      !valid && s.invalid
    );

    return img || (type === 'file' && img !== null) ? (
      <Skeleton enable={skeleton}>
        <div className={classes}>
          <Icon variant='dimmed' name={img ?? 'Upload'} />
          <input ref={ref} type={variant === 'color' ? 'color' : type} {...props} />
        </div>
      </Skeleton>
    ) : (
      <Skeleton enable={skeleton}>
        <input
          className={classes}
          type={variant === 'color' ? 'color' : type}
          ref={ref}
          {...props}
        />
      </Skeleton>
    )
  }
)
Input.displayName = "Input"

export { Input }
