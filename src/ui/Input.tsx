import React from "react"
import s from './styles/Input.module.css' 
import { cn, λIcon } from "./utils"
import { cva, type VariantProps } from "class-variance-authority"; 
import { Icon } from "./Icon";
import { Skeleton } from "./Skeleton";

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
  img?: λIcon | null;
  revert?: boolean;
  skeleton?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, revert, skeleton, variant, type, size, img, ...props }, ref) => {
    return img || (type === 'file' && img !== null) ? (
      <Skeleton enable={skeleton}>
        <div className={cn(
          inputVariants({ variant, size, className }),
          s.input,
          s.image,
          revert && s.revert
        )}>
          <Icon variant='dimmed' name={img ?? 'Upload'} alt='' />
          <input ref={ref} type={variant === 'color' ? 'color' : type} {...props} />
        </div>
      </Skeleton>
    ) : (
      <Skeleton enable={skeleton}>
        <input
          className={cn(
            inputVariants({ variant, size, className }),
            s.input,
            img && s.image
          )}
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
