import React from 'react'
import s from './styles/Input.module.css'
import { cn } from '@impactium/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Icon } from '@impactium/icons';
import { Skeleton, Stack } from '@impactium/components';
import { Label } from './Label';

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
  label?: string;
  revert?: boolean;
  skeleton?: boolean;
  valid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, valid = true, revert, label, skeleton, variant, disabled, type, size, img, ...props }, ref) => {
    const classes = cn(
      inputVariants({ variant, size, className }),
      s.input,
      img || type === 'file' ? s.image : null,
      revert && s.revert,
      !valid && s.invalid,
      disabled && s.disabled
    );

    const InputIcon = () => {
      if (!img && (type !== 'file' || img === null)) {
        return null;
      }

      return <Icon variant='dimmed' name={img ?? 'Upload'} />;
    }

    return (
      <Skeleton show={skeleton}>
        <Stack dir='column' gap={6} ai='flex-start' data-input>
          <Label value={label} />
          <div className={classes}>
            <InputIcon />
            <input ref={ref} type={variant === 'color' ? 'color' : type} {...props} />
          </div>
        </Stack>

      </Skeleton>
    )
  }
)
Input.displayName = 'Input'

export { Input }
