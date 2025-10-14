import React from 'react'
import s from './styles/Input.module.css'
import { cn } from '@impactium/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Icon } from '@impactium/icons';
import { Label } from './Label';
import { Skeleton } from './Skeleton';
import { Stack } from './Stack';

const inputVariants = cva(s.button, {
  variants: {
    variant: {
      default: s.default,
      highlighted: s.highlighted,
      color: s.color
    },
    size: {
      default: s.defaultSize,
      sm: s.sm,
      lg: s.lg
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof inputVariants> {
  icon?: Icon.Name | null;
  label?: string;
  revert?: boolean;
  skeleton?: boolean;
  valid?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, valid = true, revert, label, skeleton, variant, disabled, type, size, icon, onChange, ...props }, ref) => {
    const classes = cn(
      inputVariants({ variant, size, className }),
      s.wrapper,
      icon || type === 'file' ? s.image : null,
      revert && s.revert,
      !valid && s.invalid,
      disabled && s.disabled
    );

    const InputIcon = () => {
      if (!icon && (type !== 'file' || icon === null)) {
        return null;
      }

      return <Icon variant='dimmed' name={icon ?? 'Upload'} />;
    }

    return (
      <Skeleton show={skeleton}>
        <Stack dir='column' gap={6} ai='flex-start' data-input>
          <Label htmlFor={label} value={label} />
          <div className={classes}>
            <InputIcon />
            <input id={label} ref={ref} type={variant === 'color' ? 'color' : type} {...props} onChange={onChange || (() => {})}/>
          </div> 
        </Stack>
      </Skeleton>
    )
  }
)
Input.displayName = 'Input'

export { Input }
