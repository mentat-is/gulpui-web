import React from 'react'
import s from './styles/Input.module.css' 
import { cn } from './utils'
import { cva, type VariantProps } from 'class-variance-authority'; 
import { Icon } from '@impactium/icons';
import { Skeleton } from '@impactium/components';

const inputVariants = cva(s.button, {
  variants: {
    variant: {
      default: s.default,
      highlighted: s.highlighted,
      color: s.color
    },
    size: {
      default: s.defaultSize,
      sm: s.sm
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
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

    const InputIcon = () => {
      if (!img && (type !== 'file' || img === null)) {
        return null;
      }

      return <Icon variant='dimmed' name={img ?? 'Upload'} />;
    }

    return (
      <Skeleton show={skeleton}>
        <div className={classes}>
          <InputIcon />
          <input ref={ref} type={variant === 'color' ? 'color' : type} {...props} />
        </div>
      </Skeleton>
    )
  }
)
Input.displayName = 'Input'

export { Input }
