import { Icon } from "@impactium/icons";
import s from './styles/Button.module.css';

interface LoadingProps {
  size: undefined | `${number}` | number;
  variant?: Icon.Variant;
  no_text?: boolean;
}

export function Loading({ no_text, size, variant = 'black' }: LoadingProps) {
  return (
    <>
      <Icon size={Number(size)} className={s.loading_icon} variant={variant} name='LoaderCircle' />
      {!no_text && 'Please wait'}
    </>
  )
}