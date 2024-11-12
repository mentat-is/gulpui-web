import { Icon, IconProps } from "./Icon";
import s from './styles/Button.module.css';

interface LoadingProps {
  size: "default" | "sm" | "lg" | "icon" | undefined | null | `${number}` | number;
  variant?: IconProps['variant'];
  no_text?: boolean;
}

export function Loading({ no_text, size, variant = 'black' }: LoadingProps) {
  return (
    <>
      <Icon size={48} className={s.loading_icon} variant={variant} name='LoaderCircle' />
      {(size !== 'icon') && (
        !no_text && 'Please wait'
        )}
    </>
  )
}